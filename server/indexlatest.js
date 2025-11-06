// server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

/* 🚀 INITIAL SETUP -------------------------------------------------- */
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

/* 🌍 GLOBAL STATE ---------------------------------------------------- */
let players = {}; // { socket.id: { nickname, mode, isOnline } }
let waitingRooms = { easy: [], hard: [] };
let gameRooms = {}; // { mode: { players, turnOrder, currentTurnIndex, currentTurn, rounds, currentProblem, startTime, answers, scores } }
const personalBests = {}; // nickname => best score

// timers and locks per mode
const gameTimers = {}; // { mode: timeoutId }
const roundLock = { easy: false, hard: false };

/* 🧰 ADMIN API ------------------------------------------------------- */
app.get("/admin/clients", (_req, res) => {
  const online = Object.values(players).filter((p) => p.isOnline).map((p) => p.nickname);

  const rooms = Object.fromEntries(
    Object.entries(gameRooms).map(([mode, r]) => [
      mode,
      r
        ? {
            players: r.players,
            turnOrder: r.turnOrder,
            currentTurn: r.currentTurn,
            rounds: r.rounds,
            scores: r.scores || {},
          }
        : null,
    ])
  );

  res.json({ onlineCount: online.length, online, rooms });
});

app.post("/admin/reset", (_req, res) => {
  waitingRooms = { easy: [], hard: [] };
  gameRooms = {};
  Object.keys(players).forEach((id) => {
    if (players[id]) players[id].mode = null;
  });
  // clear timers
  Object.values(gameTimers).forEach((t) => clearTimeout(t));
  Object.keys(gameTimers).forEach((k) => delete gameTimers[k]);

  io.emit("gameover", { reason: "reset_by_admin" });
  updatePlayerList();
  res.json({ ok: true });
});

/* 🎲 PROBLEM GENERATION ---------------------------------------------- */
function createExpressionWithResult(numbers, ops, mode, disabledOps = []) {
  // Fisher–Yates shuffle
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const nums = shuffle(numbers);
  const allowedOps = ops.filter((op) => !disabledOps.includes(op));
  const perfectSquares = new Set([1, 4, 9]);
  const canUseRoot = mode === "hard" && allowedOps.includes("√") && nums.some((n) => perfectSquares.has(n));

  let expr = "";
  let result = 0;
  let attempts = 0;

  function buildOne() {
    let s = "";
    let openParen = 0;
    let prev = ""; // track previous token type
    for (let i = 0; i < nums.length; i++) {
      // randomly open paren (rare)
      if (mode === "hard" && Math.random() < 0.18 && i < nums.length - 2 && openParen === 0) {
        s += "(";
        openParen++;
        prev = "(";
      }

      // optionally place a root before a perfect square
      if (canUseRoot && Math.random() < 0.28 && perfectSquares.has(nums[i]) && (prev === "" || /[+\-×÷(]/.test(prev))) {
        s += "√";
        prev = "√";
      }

      s += nums[i];
      prev = String(nums[i]);

      // maybe close paren
      if (mode === "hard" && openParen > 0 && Math.random() < 0.25 && i > 1) {
        s += ")";
        openParen--;
        prev = ")";
      }

      if (i < nums.length - 1) {
        // pick an operator that doesn't repeat wrongly
        let op = allowedOps[Math.floor(Math.random() * allowedOps.length)];
        // avoid two operators in a row in generated string
        if (/[+\-×÷]$/.test(s) && /[+\-×÷]/.test(op)) {
          // choose another op that's not an operator or same
          const alt = allowedOps.find((o) => !/[+\-×÷]/.test(o));
          if (alt) op = alt;
        }
        s += op;
        prev = op;
      }
    }

    while (openParen > 0) {
      s += ")";
      openParen--;
    }

    return s;
  }

  while (attempts < 800) {
    attempts++;
    expr = buildOne();

    // basic invalid patterns check
    if (/[\+\-×÷]{2,}/.test(expr)) continue;
    if (/√√/.test(expr)) continue;
    if (/\(\)/.test(expr)) continue;
    if (/\d√/.test(expr)) continue;
    if (/\)√/.test(expr)) continue;

    try {
      const clean = expr.replace(/×/g, "*").replace(/÷/g, "/").replace(/√(\d+|\([^()]+\))/g, "Math.sqrt($1)");
      const val = eval(clean);
      if (!Number.isFinite(val)) continue;
      // if root used ensure root arguments are perfect squares
      if (expr.includes("√")) {
        const regex = /√(\d+)/g;
        let m;
        let badRoot = false;
        while ((m = regex.exec(expr)) !== null) {
          const n = parseInt(m[1], 10);
          if (Math.sqrt(n) % 1 !== 0) {
            badRoot = true;
            break;
          }
        }
        if (badRoot) continue;
      }
      // accept only positive integer results
      if (Number.isInteger(val) && val > 0) {
        result = val;
        break;
      }
    } catch (e) {
      // ignore and retry
    }
  }

  // fallback safe expression if nothing valid found
  if (!Number.isFinite(result) || !Number.isInteger(result) || result <= 0) {
    expr = `${numbers[0]}+${numbers[1]}`;
    result = numbers[0] + numbers[1];
  }

  return { expr, result };
}

function generateProblem(mode) {
  const numsPool = Array.from({ length: 9 }, (_, i) => i + 1);
  const selected = [];
  while (selected.length < 5) {
    const idx = Math.floor(Math.random() * numsPool.length);
    selected.push(numsPool.splice(idx, 1)[0]);
  }

  const baseOps = ["+", "-", "×", "÷"];
  const disabled = [];
  if (mode === "hard") {
    while (disabled.length < 2) {
      const op = baseOps[Math.floor(Math.random() * baseOps.length)];
      if (!disabled.includes(op)) disabled.push(op);
    }
  }

  const allOps = mode === "hard" ? baseOps.concat(["√", "(", ")"]) : baseOps;

  let expr = "";
  let result = 0;
  let attempts = 0;

  while ((!Number.isInteger(result) || result <= 0) && attempts < 1000) {
    attempts++;
    const p = createExpressionWithResult(selected, allOps, mode, disabled);
    expr = p.expr;
    result = p.result;
  }

  if (!Number.isInteger(result) || result <= 0) {
    expr = `${selected[0]}+${selected[1]}`;
    result = selected[0] + selected[1];
  }

  return {
    digits: selected,
    operators: allOps,
    disabledOps: disabled,
    target: result,
    expr,
    mode,
  };
}

/* 🔍 HELPERS -------------------------------------------------------- */
function updatePlayerList() {
  const list = Object.values(players).filter((p) => p.isOnline).map((p) => p.nickname);
  io.emit("playerList", list);
}

function findSocketIdByNickname(name) {
  return Object.keys(players).find((id) => players[id]?.nickname === name) || null;
}

function clearModeTimer(mode) {
  if (gameTimers[mode]) {
    clearTimeout(gameTimers[mode]);
    delete gameTimers[mode];
  }
}

function scheduleAutoSwitch(mode, roundSeconds = 60) {
  clearModeTimer(mode);
  gameTimers[mode] = setTimeout(() => {
    console.log(`⏰ [${mode}] Auto-switch (time up)`);
    nextTurn(mode);
  }, roundSeconds * 1000);
}

/* ⚙️ TURN MANAGEMENT ----------------------------------------------- */
function nextTurn(mode) {
  const room = gameRooms[mode];
  if (!room) return;

  if (roundLock[mode]) {
    console.log(`⚠️ [LOCKED] nextTurn(${mode}) ignored`);
    return;
  }
  roundLock[mode] = true;

  try {
    if (!room.players || room.players.length < 2) {
      io.to(mode).emit("gameover", { reason: "not_enough_players" });
      delete gameRooms[mode];
      clearModeTimer(mode);
      return;
    }

    room.turnCount = (room.turnCount || 0) + 1;
    if (room.turnCount >= room.turnOrder.length) {
      room.rounds = (room.rounds || 1) + 1;
      room.turnCount = 0;
      room.currentProblem = generateProblem(mode);
      io.to(mode).emit("newRound", { round: room.rounds, ...room.currentProblem });
      console.log(`🏁 [${mode}] New round ${room.rounds}`);
    }

    room.currentTurnIndex = ((room.currentTurnIndex || 0) + 1) % room.turnOrder.length;
    const nextPlayer = room.turnOrder[room.currentTurnIndex];
    room.currentTurn = nextPlayer;

    io.to(mode).emit("turnSwitch", {
      nextTurn: nextPlayer,
      currentTurnIndex: room.currentTurnIndex,
      round: room.rounds,
    });

    const startTime = Date.now();
    room.startTime = startTime;
    const roundTime = room.mode === "hard" ? 30 : 60;
    io.to(mode).emit("syncTimer", { mode, startTime });

    const nextSocketId = findSocketIdByNickname(nextPlayer);
    if (nextSocketId) io.to(nextSocketId).emit("yourTurn", { mode });

    scheduleAutoSwitch(mode, room.mode === "hard" ? 30 : 60);
  } finally {
    setTimeout(() => {
      roundLock[mode] = false;
      console.log(`🔓 [${mode}] unlocked`);
    }, 1200);
  }
}

/* ⚙️ SOCKET.IO EVENTS ----------------------------------------------- */
io.on("connection", (socket) => {
  console.log("🟢 Player connected:", socket.id);

  socket.on("setNickname", (nickname) => {
    if (!nickname) return;
    players[socket.id] = { nickname, mode: null, isOnline: true };
    console.log(`👤 ${nickname} is now online (${socket.id})`);
    updatePlayerList();
  });

  socket.on("joinGame", ({ nickname, mode }) => {
    if (!nickname || !mode) return;

    const old = players[socket.id];
    if (old?.mode && waitingRooms[old.mode]) {
      waitingRooms[old.mode] = waitingRooms[old.mode].filter((p) => p !== old.nickname);
    }

    players[socket.id] = { nickname, mode, isOnline: true };
    socket.join(mode);
    if (!waitingRooms[mode].includes(nickname)) waitingRooms[mode].push(nickname);

    console.log(`👤 ${nickname} joined waiting room ${mode}`);
    io.to(mode).emit("waitingList", { mode, players: waitingRooms[mode] });
    updatePlayerList();

    if (waitingRooms[mode].length >= 2) {
      io.to(mode).emit("canStart", { mode, canStart: true });
    }
  });

  socket.on("startGame", ({ mode, nickname }) => {
    if (!mode || !nickname) return;
    const activePlayers = [...waitingRooms[mode]];
    if (activePlayers.length < 2) return;

    console.log(`🚀 ${nickname} started ${mode} game with:`, activePlayers);

    const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);
    const firstProblem = generateProblem(mode);

    gameRooms[mode] = {
      players: activePlayers,
      turnOrder: shuffled,
      currentTurnIndex: 0,
      currentTurn: shuffled[0],
      rounds: 1,
      currentProblem: firstProblem,
      turnCount: 0,
      mode,
      answers: [],
      scores: {},
      startTime: Date.now(),
    };

    // initialize scores
    gameRooms[mode].players.forEach((p) => (gameRooms[mode].scores[p] = 0));

    io.to(mode).emit("preGameStart", {
      mode,
      players: activePlayers,
      starter: nickname,
      countdown: 3,
    });

    setTimeout(() => {
      io.to(mode).emit("gameStart", {
        ...firstProblem,
        players: activePlayers,
        startedBy: nickname,
        currentTurn: shuffled[0],
        message: `🎮 Game started by ${nickname} (${shuffled.join(", ")})`,
        round: 1,
        solutionExpr: firstProblem.expr,
      });

      setTimeout(() => {
        const startTime = Date.now();
        gameRooms[mode].startTime = startTime;
        io.to(mode).emit("syncTimer", { mode, startTime });

        const firstSocketId = findSocketIdByNickname(shuffled[0]);
        if (firstSocketId) io.to(firstSocketId).emit("yourTurn", { mode });

        scheduleAutoSwitch(mode, gameRooms[mode].mode === "hard" ? 30 : 60);
        waitingRooms[mode] = [];
        updatePlayerList();
      }, 500);
    }, 3000);
  });

  socket.on("resumeGame", ({ mode }) => {
    if (!mode) return;
    nextTurn(mode);
  });

  socket.on("skipTurn", ({ mode, nickname }) => {
    const room = gameRooms[mode];
    if (!room) return;
    console.log(`⏭️ ${nickname} skipped turn in ${mode}`);
    // record skipped as an answer (optional)
    room.answers.push({ player: nickname, correct: false, skipped: true, time: 0 });
    // move to next
    nextTurn(mode);
  });

  socket.on("answerResult", (data) => {
    if (!data?.mode) return;
    const room = gameRooms[data.mode];
    if (!room) return;

    const timeTaken = (Date.now() - (room.startTime || Date.now())) / 1000;
    room.answers.push({
      player: data.nickname,
      correct: !!data.correct,
      time: timeTaken,
    });

    console.log(`🧩 ${data.nickname} answered ${data.correct ? "✅" : "❌"} in ${timeTaken.toFixed(2)}s`);

    // If all players have answered or exhaustive condition
    if (room.answers.length >= room.players.length) {
      const correctOnes = room.answers.filter((a) => a.correct);
      if (correctOnes.length > 0) {
        // fastest correct wins
        const winner = correctOnes.reduce((a, b) => (a.time < b.time ? a : b));
        room.scores[winner.player] = (room.scores[winner.player] || 0) + 1;

        // update personal best
        const nb = room.scores[winner.player];
        if (!personalBests[winner.player] || nb > personalBests[winner.player]) {
          personalBests[winner.player] = nb;
          console.log(`🏅 New personal best for ${winner.player}: ${nb}`);
        }

        io.to(data.mode).emit("roundResult", {
          winner: winner.player,
          scores: room.scores,
          answers: room.answers,
        });
      } else {
        io.to(data.mode).emit("roundResult", {
          winner: null,
          scores: room.scores,
          answers: room.answers,
        });
      }

      // reset answers for next round/turn but do not auto-advance here — clients call resumeGame or server can call nextTurn
      room.answers = [];
    }
  });

  socket.on("playerLeftGame", ({ nickname, mode }) => {
    const room = gameRooms[mode];
    if (!room) return;
    console.log(`🚪 ${nickname} left ${mode}`);

    room.turnOrder = room.turnOrder.filter((n) => n !== nickname);
    room.players = room.players.filter((n) => n !== nickname);
    delete room.scores?.[nickname];

    if (room.turnOrder.length < 2) {
      io.to(mode).emit("gameover", { reason: "not_enough_players" });
      delete gameRooms[mode];
      clearModeTimer(mode);
      console.log("💀 Game ended (not enough players)");
      return;
    }

    if (room.currentTurn === nickname) {
      room.currentTurnIndex = room.currentTurnIndex % room.turnOrder.length;
      const nextTurn = room.turnOrder[room.currentTurnIndex];
      room.currentTurn = nextTurn;

      io.to(mode).emit("turnSwitch", { nextTurn, currentTurnIndex: room.currentTurnIndex });

      const nextSocket = findSocketIdByNickname(nextTurn);
      if (nextSocket) io.to(nextSocket).emit("yourTurn", { mode });

      scheduleAutoSwitch(mode, room.mode === "hard" ? 30 : 60);
    }
  });

  socket.on("leaveLobby", (nickname) => {
    if (!nickname) return;
    if (players[socket.id]) {
      players[socket.id].isOnline = false;
      players[socket.id].mode = null;
    }
    console.log(`🚪 ${nickname} left lobby`);
    updatePlayerList();
  });

  socket.on("reaction", (data) => {
    const { mode, emoji, nickname } = data;
    if (!mode) return;
    io.to(mode).emit("reaction", { emoji, from: nickname });
  });

  socket.on("getPersonalBest", ({ nickname }) => {
    const best = personalBests[nickname] || 0;
    socket.emit("personalBest", { nickname, best });
  });

  socket.on("disconnect", () => {
    const player = players[socket.id];
    if (!player) return;
    console.log(`🔴 ${player.nickname} disconnected (${socket.id})`);
    if (player.mode && waitingRooms[player.mode]) {
      waitingRooms[player.mode] = waitingRooms[player.mode].filter((p) => p !== player.nickname);
      io.to(player.mode).emit("waitingList", { mode: player.mode, players: waitingRooms[player.mode] });
    }
    player.isOnline = false;
    updatePlayerList();
  });
});

/* 🟢 START SERVER ---------------------------------------------------- */
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
