// server/index.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

/* 🚀 INITIAL SETUP -------------------------------------------------- */
const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

/* 🌍 GLOBAL STATE ---------------------------------------------------- */
let players = {}; // { socket.id: { nickname, mode, isOnline } }
let waitingRooms = { easy: [], hard: [] };
let gameRooms = {}; // { mode: { players, turnOrder, currentTurnIndex, currentTurn, rounds, ... } }

/* 💾 per-mode locks & timers */
const roundLock = { easy: false, hard: false };
const gameTimers = { easy: null, hard: null };

/* ⚙️ SOCKET HELPERS ------------------------------------------------- */
function updatePlayerList() {
  const list = Object.values(players)
    .filter((p) => p.isOnline)
    .map((p) => p.nickname);
  io.emit("playerList", list);
}

// returns socketId (string) or undefined
function findSocketByNickname(name) {
  return Object.keys(players).find((id) => players[id]?.nickname === name);
}

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
      result = eval(clean);
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

/* ⚙️ Helper: switch to next turn (used by resumeGame & timers) */
function nextTurn(mode) {
  const room = gameRooms[mode];
  if (!room) return;

  // prevent concurrent processing for the same mode
  if (roundLock[mode]) {
    console.log(`⚠️ [LOCKED] Resume for ${mode} ignored (processing)`);
    return;
  }
  roundLock[mode] = true;

  // not enough players -> game over
  if (!room.players || room.players.length < 2) {
    io.to(mode).emit("gameover", { reason: "not_enough_players" });
    delete gameRooms[mode];
    roundLock[mode] = false;
    return;
  }

  // initialize turnCount if needed
  if (room.turnCount === undefined) room.turnCount = 0;
  room.turnCount += 1;

  // if finished a full turn order -> new round and generate new problem
  if (room.turnCount >= room.turnOrder.length) {
    room.rounds = (room.rounds || 1) + 1;
    room.turnCount = 0;
    console.log(`🏁 End of round → starting Round ${room.rounds}`);

    room.currentProblem = generateProblem(mode);
    io.to(mode).emit("newRound", {
      round: room.rounds,
      ...room.currentProblem,
    });
  }

  // advance currentTurnIndex and pick next player
  room.currentTurnIndex = ((room.currentTurnIndex || 0) + 1) % room.turnOrder.length;
  const nextPlayer = room.turnOrder[room.currentTurnIndex];
  room.currentTurn = nextPlayer;
  console.log(`🔁 Switching turn to ${nextPlayer} (Round ${room.rounds})`);

  // broadcast turn switch with friendly payload
  io.to(mode).emit("turnSwitch", {
    nextTurn: nextPlayer,
    currentTurnIndex: room.currentTurnIndex,
    round: room.rounds,
  });

  // send a syncTimer for all clients (host responsibility concept retained: send by server here)
  const startTime = Date.now();
  io.to(mode).emit("syncTimer", { mode, startTime });
  console.log(`🕒 Timer synced for ${mode} (Round ${room.rounds}), startTime: ${new Date(startTime).toLocaleTimeString()}`);

  // notify next player's socket to start their turn
  const nextSocketId = findSocketByNickname(nextPlayer);
  if (nextSocketId) {
    io.to(nextSocketId).emit("yourTurn", { mode });
  }

  // restart auto-turn timer for next player's turn
  const ROUND_TIME = 30;
  if (gameTimers[mode]) clearTimeout(gameTimers[mode]);
  gameTimers[mode] = setTimeout(() => {
    console.log(`⏰ Time up! Auto-switching again in ${mode}`);
    nextTurn(mode); // auto-advance if nobody resumes
  }, ROUND_TIME * 1000);

  // unlock after a small delay to avoid race conditions
  setTimeout(() => {
    roundLock[mode] = false;
    console.log(`🔓 [UNLOCK] ${mode} ready for next resume`);
  }, 2000);
}

/* ⚙️ SOCKET EVENTS --------------------------------------------------- */
io.on("connection", (socket) => {
  console.log("🟢 Player connected:", socket.id);

  /* setNickname */
  socket.on("setNickname", (nickname) => {
    if (!nickname) return;
    players[socket.id] = { nickname, mode: null, isOnline: true };
    console.log(`👤 ${nickname} is now online`);
    updatePlayerList();
  });

  /* joinGame */
  socket.on("joinGame", ({ nickname, mode }) => {
    if (!nickname || !mode) return;

    // remove from old waiting room if present
    const old = players[socket.id];
    if (old?.mode) {
      waitingRooms[old.mode] = waitingRooms[old.mode].filter((p) => p !== old.nickname);
    }

    // join new room
    players[socket.id] = { nickname, mode, isOnline: true };
    socket.join(mode);
    if (!waitingRooms[mode].includes(nickname)) waitingRooms[mode].push(nickname);

    console.log(`👤 ${nickname} joined ${mode}`);
    io.to(mode).emit("waitingList", { mode, players: waitingRooms[mode] });
    updatePlayerList();

    // if enough players, notify clients that host can start
    if (waitingRooms[mode].length >= 2) {
      io.to(mode).emit("canStart", { mode, canStart: true });
    }
  });

  /* startGame */
  socket.on("startGame", ({ mode, nickname }) => {
    if (!mode || !nickname) return;
    const activePlayers = [...waitingRooms[mode]];
    if (activePlayers.length < 2) return;

    console.log(`🚀 ${nickname} started ${mode} game with:`, activePlayers);

    const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);
    const ROUND_TIME = 30;

    // first problem generated by server
    const firstProblem = generateProblem(mode);

    gameRooms[mode] = {
      players: activePlayers,
      turnOrder: shuffled,
      currentTurnIndex: 0,
      currentTurn: shuffled[0],
      rounds: 1,
      currentProblem: firstProblem,
      answers: [],
      problemGenerated: true,
      turnCount: 0,
    };

    io.to(mode).emit("preGameStart", {
      mode,
      players: activePlayers,
      starter: nickname,
      countdown: 3,
    });

    // wait for client countdown to finish
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

      // small extra delay, then sync timer + tell first player it's their turn
      setTimeout(() => {
        const firstSocketId = findSocketByNickname(shuffled[0]);
        const startTime = Date.now();
        io.to(mode).emit("syncTimer", { mode, startTime });
        console.log(`🕒 Timer started at ${new Date(startTime).toLocaleTimeString()} for mode ${mode}`);
        if (firstSocketId) io.to(firstSocketId).emit("yourTurn", { mode });

        // start auto-turn timer for the first player's turn
        if (gameTimers[mode]) clearTimeout(gameTimers[mode]);
        gameTimers[mode] = setTimeout(() => {
          console.log(`⏰ Time up! Auto-switching turn in ${mode}`);
          nextTurn(mode);
        }, ROUND_TIME * 1000);
      }, 500);

      // clear waiting room since we moved players to game
      waitingRooms[mode] = [];
    }, 3000);
  });

  /* resumeGame (client asks to resume / move to next turn) */
  socket.on("resumeGame", ({ mode }) => {
    // call nextTurn — nextTurn will handle locks/timers
    nextTurn(mode);
  });

  /* answerResult (client submits an answer) */
  socket.on("answerResult", (data) => {
    if (!data.mode) return;
    const room = gameRooms[data.mode];
    if (!room) return;

    const isHard = data.mode === "hard";
    let correct = false;
    let correctExpr = null;
    let correctResult = null;

    if (isHard && room.currentProblem) {
      // server-side validation against generated expression
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
      // normal mode: trust client flag
      correct = !!data.correct;
    }

    // broadcast final answer + server solution where appropriate
    io.to(data.mode).emit("answerResult", {
      ...data,
      correct,
      solutionExpr: correctExpr,
      solutionResult: correctResult,
    });
  });

  /* playerLeftGame */
  socket.on("playerLeftGame", ({ nickname, mode }) => {
    const room = gameRooms[mode];
    if (!room) return;

    console.log(`🚪 ${nickname} left ${mode}`);

    room.turnOrder = room.turnOrder.filter((n) => n !== nickname);
    room.players = room.players.filter((n) => n !== nickname);

    // if too few players left -> end game
    if (room.turnOrder.length < 2) {
      io.to(mode).emit("gameover", { reason: "not_enough_players" });
      delete gameRooms[mode];
      console.log("💀 Game ended (not enough players)");
      return;
    }

    // if player left and it was their turn -> move to next player immediately
    if (room.currentTurn === nickname) {
      // keep index within new length
      room.currentTurnIndex = room.currentTurnIndex % room.turnOrder.length;
      const nextTurn = room.turnOrder[room.currentTurnIndex];
      room.currentTurn = nextTurn;

      io.to(mode).emit("turnSwitch", {
        nextTurn,
        currentTurnIndex: room.currentTurnIndex,
        round: room.rounds,
      });

      const nextSocket = findSocketByNickname(nextTurn);
      if (nextSocket) io.to(nextSocket).emit("yourTurn", { mode });
    }
  });

  /* leaveLobby (player leaves waiting lobby but stays connected) */
  socket.on("leaveLobby", (nickname) => {
    if (!nickname) return;
    if (players[socket.id]) {
      players[socket.id].isOnline = false;
      players[socket.id].mode = null;
    }
    console.log(`🚪 ${nickname} left lobby`);
    updatePlayerList();
  });

  /* disconnect */
  socket.on("disconnect", () => {
    const player = players[socket.id];
    if (!player) return;

    console.log(`🔴 ${player.nickname} disconnected`);

    // remove from waiting room if present
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
server.listen(PORT, () =>
  console.log(`✅ Server running on port ${PORT} (multi-turn, rounds, reconnect safe)`)
);
