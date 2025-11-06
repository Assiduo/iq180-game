// server.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* 🚀 INITIAL SETUP -------------------------------------------------- */
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

/* 🌍 GLOBAL STATE ---------------------------------------------------- */
let players = {}; // { socket.id: { nickname, mode, isOnline } }
let waitingRooms = { easy: [], hard: [] };
let gameRooms = {}; // { mode: { players, turnOrder, currentTurnIndex, currentTurn, rounds, currentProblem, turnCount } }

// timers per mode (keeps timeout refs)
const gameTimers = {}; // { mode: timeoutId }

/* 🧰 ADMIN API (ADD HERE) ------------------------------------------- */
// GET /admin/clients  -> online count, list, and room snapshots
app.get("/admin/clients", (_req, res) => {
  const online = Object.values(players)
    .filter((p) => p.isOnline)
    .map((p) => p.nickname);

  const rooms = Object.fromEntries(
    Object.entries(gameRooms).map(([mode, r]) => [
      mode,
      r
        ? {
            players: r.players,
            turnOrder: r.turnOrder,
            currentTurn: r.currentTurn,
            rounds: r.rounds,
          }
        : null,
    ])
  );

  res.json({ onlineCount: online.length, online, rooms });
});

// POST /admin/reset -> clear server state and end any running games
app.post("/admin/reset", (_req, res) => {
  waitingRooms = { easy: [], hard: [] };
  gameRooms = {};
  for (const id of Object.keys(players)) {
    if (players[id]) players[id].mode = null;
  }
  // clear timers
  Object.values(gameTimers).forEach((t) => clearTimeout(t));
  Object.keys(gameTimers).forEach((k) => delete gameTimers[k]);

  io.emit("gameover", { reason: "reset_by_admin" });
  updatePlayerList();
  res.json({ ok: true });
});

/* 🎲 SERVER PROBLEM GENERATOR -------------------------------------- */
function createExpressionWithResult(numbers, ops, mode, disabledOps = []) {
  const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);
  const nums = shuffle([...numbers]);
  const allowedOps = ops.filter((op) => !disabledOps.includes(op));
  let expr = "",
    attempts = 0,
    result = 0;

  while ((!Number.isInteger(result) || result <= 0) && attempts < 300) {
    attempts++;
    expr = "";
    for (let i = 0; i < nums.length; i++) {
      let n = nums[i];
      if (mode === "hard" && allowedOps.includes("√") && Math.random() < 0.3)
        n = `√${n}`;
      expr += n;
      if (i < nums.length - 1)
        expr += allowedOps[Math.floor(Math.random() * allowedOps.length)];
    }
    try {
      const clean = expr
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/√(\d+)/g, "Math.sqrt($1)");
      result = eval(clean); // intentional: server-side eval for generated expressions
    } catch {
      result = 0;
    }
  }
  return { expr, result };
}

function generateProblem(mode) {
  const nums = Array.from({ length: 9 }, (_, i) => i + 1);
  const selected = [];
  while (selected.length < 5) {
    const idx = Math.floor(Math.random() * nums.length);
    selected.push(nums.splice(idx, 1)[0]);
  }

  const baseOps = ["+", "-", "×", "÷"];
  const dis = [];
  if (mode === "hard") {
    while (dis.length < 2) {
      const op = baseOps[Math.floor(Math.random() * baseOps.length)];
      if (!dis.includes(op)) dis.push(op);
    }
  }

  const allOps = mode === "hard" ? baseOps.concat(["√", "(", ")"]) : baseOps;
  const { expr, result } = createExpressionWithResult(selected, allOps, mode, dis);
  return {
    digits: selected,
    operators: allOps,
    disabledOps: dis,
    target: result,
    expr,
    mode,
  };
}

/* 🔍 HELPERS -------------------------------------------------------- */
function updatePlayerList() {
  const list = Object.values(players)
    .filter((p) => p.isOnline)
    .map((p) => p.nickname);
  io.emit("playerList", list);
}

function findSocketIdByNickname(name) {
  return Object.keys(players).find((id) => players[id]?.nickname === name) || null;
}

/* ⚙️ TURN / ROUND MANAGEMENT --------------------------------------- */
/**
 * nextTurn(mode)
 * - advances turn index, emits turnSwitch & syncTimer & yourTurn to next player
 * - generates new round problem when necessary
 * - clears/starts timeout for next turn
 */
const roundLock = { easy: false, hard: false };

function clearModeTimer(mode) {
  if (gameTimers[mode]) {
    clearTimeout(gameTimers[mode]);
    delete gameTimers[mode];
  }
}

function scheduleAutoSwitch(mode, roundTime = 60) {
  clearModeTimer(mode);
  gameTimers[mode] = setTimeout(() => {
    console.log(`⏰ [${mode}] Auto-switch (time up)`);
    // When time up, server advances to next player
    nextTurn(mode);
  }, roundTime * 1000);
}

function nextTurn(mode) {
  const room = gameRooms[mode];
  if (!room) return;

  // prevent re-entrancy
  if (roundLock[mode]) {
    console.log(`⚠️ [LOCKED] nextTurn(${mode}) ignored`);
    return;
  }
  roundLock[mode] = true;

  try {
    // if not enough players -> end game
    if (!room.players || room.players.length < 2) {
      io.to(mode).emit("gameover", { reason: "not_enough_players" });
      delete gameRooms[mode];
      clearModeTimer(mode);
      return;
    }

    // increment turn count & maybe new round
    room.turnCount = (room.turnCount || 0) + 1;
    if (room.turnCount >= room.turnOrder.length) {
      room.rounds = (room.rounds || 1) + 1;
      room.turnCount = 0;
      room.currentProblem = generateProblem(mode);
      io.to(mode).emit("newRound", {
        round: room.rounds,
        ...room.currentProblem,
      });
      console.log(`🏁 [${mode}] New round ${room.rounds} generated`);
    }

    // advance index & pick next player
    room.currentTurnIndex = ((room.currentTurnIndex || 0) + 1) % room.turnOrder.length;
    const nextPlayer = room.turnOrder[room.currentTurnIndex];
    room.currentTurn = nextPlayer;

    // emit turnSwitch
    io.to(mode).emit("turnSwitch", {
      nextTurn: nextPlayer,
      currentTurnIndex: room.currentTurnIndex,
      round: room.rounds,
    });

    // emit syncTimer to all clients with a startTime
    const startTime = Date.now();
    const roundTime = room.mode === "hard" ? 30 : 60;
    io.to(mode).emit("syncTimer", { mode, startTime });
    console.log(`🕒 [${mode}] syncTimer emitted (start: ${new Date(startTime).toLocaleTimeString()}) for player ${nextPlayer}`);

    // notify the next player's socket to begin their UI turn
    const nextSocketId = findSocketIdByNickname(nextPlayer);
    if (nextSocketId) {
      io.to(nextSocketId).emit("yourTurn", { mode });
    }

    // restart auto-switch timer for the next turn
    scheduleAutoSwitch(mode, room.mode === "hard" ? 30 : 60);
  } finally {
    // unlock after short delay so double-resume can't race (server-side throttle)
    setTimeout(() => {
      roundLock[mode] = false;
      console.log(`🔓 [${mode}] unlocked`);
    }, 1500);
  }
}

/* ⚙️ SOCKET EVENTS -------------------------------------------------- */
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
    // remove from previous waiting room if present
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

    // indicate start-able
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

    // create first problem
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
      problemGenerated: true,
    };

    // broadcast preGame & countdown
    io.to(mode).emit("preGameStart", {
      mode,
      players: activePlayers,
      starter: nickname,
      countdown: 3,
    });

    // after countdown -> gameStart & sync
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

      // small delay then sync timer + notify first player's yourTurn
      setTimeout(() => {
        const startTime = Date.now();
        io.to(mode).emit("syncTimer", { mode, startTime });

        const firstSocketId = findSocketIdByNickname(shuffled[0]);
        if (firstSocketId) {
          io.to(firstSocketId).emit("yourTurn", { mode });
        }

        // schedule auto-switch for first turn
        scheduleAutoSwitch(mode, gameRooms[mode].mode === "hard" ? 30 : 60);
        // clear waiting room
        waitingRooms[mode] = [];
        updatePlayerList();
      }, 500);
    }, 3000);
  });

  // client triggers resume (e.g., after answer popup) -> server advances
  socket.on("resumeGame", ({ mode }) => {
    if (!mode) return;
    nextTurn(mode);
  });

  // answer result sync from clients
  socket.on("answerResult", (data) => {
    if (!data?.mode) return;
    const room = gameRooms[data.mode];
    if (!room) return;

    const isHard = data.mode === "hard";
    let correct = false;
    let correctExpr = null;
    let correctResult = null;

    if (isHard && room.currentProblem) {
      // server validates against generated expression
      const expr = room.currentProblem.expr;
      const clean = expr
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/√(\d+|\([^()]+\))/g, "Math.sqrt($1)");
      try {
        const evalResult = eval(clean);
        correctExpr = expr;
        correctResult = evalResult;
        correct = Math.abs(evalResult - data.result) < 1e-9;
      } catch (err) {
        console.error("❌ Server-side validation error:", err);
      }
    } else {
      // normal mode rely on client-sent boolean
      correct = !!data.correct;
    }

    // broadcast answerResult with server's decision
    io.to(data.mode).emit("answerResult", {
      ...data,
      correct,
      solutionExpr: correctExpr,
      solutionResult: correctResult,
    });
  });

  socket.on("playerLeftGame", ({ nickname, mode }) => {
    const room = gameRooms[mode];
    if (!room) return;
    console.log(`🚪 ${nickname} left ${mode}`);

    room.turnOrder = room.turnOrder.filter((n) => n !== nickname);
    room.players = room.players.filter((n) => n !== nickname);

    if (room.turnOrder.length < 2) {
      io.to(mode).emit("gameover", { reason: "not_enough_players" });
      delete gameRooms[mode];
      clearModeTimer(mode);
      console.log("💀 Game ended (not enough players)");
      return;
    }

    // if leaving player had the current turn -> move to next player immediately
    if (room.currentTurn === nickname) {
      room.currentTurnIndex = room.currentTurnIndex % room.turnOrder.length;
      const nextTurnName = room.turnOrder[room.currentTurnIndex];
      room.currentTurn = nextTurnName;

      io.to(mode).emit("turnSwitch", {
        nextTurn: nextTurnName,
        currentTurnIndex: room.currentTurnIndex,
      });

      const nextSocket = findSocketIdByNickname(nextTurnName);
      if (nextSocket) io.to(nextSocket).emit("yourTurn", { mode });

      // restart timer for the new turn
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

  socket.on("disconnect", () => {
    const player = players[socket.id];
    if (!player) return;

    console.log(`🔴 ${player.nickname} disconnected (${socket.id})`);

    if (player.mode && waitingRooms[player.mode]) {
      waitingRooms[player.mode] = waitingRooms[player.mode].filter((p) => p !== player.nickname);
      io.to(player.mode).emit("waitingList", {
        mode: player.mode,
        players: waitingRooms[player.mode],
      });
    }

    player.isOnline = false;
    updatePlayerList();
  });
});

/* 🟢 START SERVER ---------------------------------------------------- */
const PORT = process.env.PORT || 4000;
server.listen(PORT, () =>
  console.log(`✅ Server running on port ${PORT} (multi-turn, rounds, reconnect safe)`)
);
