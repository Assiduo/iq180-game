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

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

/* 🌍 GLOBAL STATE ---------------------------------------------------- */
let players = {}; // { socket.id: { nickname, mode, isOnline } }
let waitingRooms = { easy: [], hard: [] };
let gameRooms = {}; // { mode: { players, turnOrder, currentTurnIndex, currentTurn, rounds } }

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
  // keep players but detach them from rooms
  for (const id of Object.keys(players)) {
    if (players[id]) {
      players[id].mode = null;
    }
  }
  io.emit("gameover", { reason: "reset_by_admin" });
  updatePlayerList();
  res.json({ ok: true });
});

/* ⚙️ SOCKET EVENTS --------------------------------------------------- */

/* 🎲 SERVER PROBLEM GENERATOR -------------------------------------- */
function createExpressionWithResult(numbers, ops, mode, disabledOps = []) {
  const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);
  const nums = shuffle([...numbers]);
  const allowedOps = ops.filter((op) => !disabledOps.includes(op));
  let expr = "", attempts = 0, result = 0;

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


io.on("connection", (socket) => {
  console.log("🟢 Player connected:", socket.id);

  /* ✅ ตั้งชื่อผู้เล่น */
  socket.on("setNickname", (nickname) => {
    if (!nickname) return;
    players[socket.id] = { nickname, mode: null, isOnline: true };
    console.log(`👤 ${nickname} is now online`);
    updatePlayerList();
  });

  /* ✅ เข้าห้องรอเกม */
  socket.on("joinGame", ({ nickname, mode }) => {
    if (!nickname || !mode) return;

    // ลบจากห้องเก่าก่อนถ้ามี
    const old = players[socket.id];
    if (old?.mode) {
      waitingRooms[old.mode] = waitingRooms[old.mode].filter(
        (p) => p !== old.nickname
      );
    }

    // เข้าห้องใหม่
    players[socket.id] = { nickname, mode, isOnline: true };
    socket.join(mode);

    if (!waitingRooms[mode].includes(nickname)) {
      waitingRooms[mode].push(nickname);
    }

    console.log(`👤 ${nickname} joined ${mode}`);
    io.to(mode).emit("waitingList", { mode, players: waitingRooms[mode] });
    updatePlayerList();

    // ถ้ามีครบ 2 คนขึ้นไป → ให้ host เริ่มได้
    if (waitingRooms[mode].length >= 2) {
      io.to(mode).emit("canStart", { mode, canStart: true });
    }
  });

  /* 🚀 เริ่มเกม */
  socket.on("startGame", ({ mode, nickname }) => {
    if (!mode || !nickname) return;
    const activePlayers = [...waitingRooms[mode]];
    if (activePlayers.length < 2) return;

    console.log(`🚀 ${nickname} started ${mode} game with:`, activePlayers);

    const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);
    const ROUND_TIME = 30;
    let gameTimers = {};

    gameRooms[mode] = {
      players: activePlayers,
      turnOrder: shuffled,
      currentTurnIndex: 0,
      currentTurn: shuffled[0],
      rounds: 1,
      currentProblem: generateProblem(mode), // ✅ สร้างโจทย์แรก
      answers: [], // ✅ เก็บคำตอบและเวลาในแต่ละรอบ
    };

    io.to(mode).emit("preGameStart", {
      mode,
      players: activePlayers,
      starter: nickname,
      countdown: 3,
    });

    setTimeout(() => {
      io.to(mode).emit("gameStart", {
        ...gameRooms[mode].currentProblem, // ✅ ใช้โจทย์จาก server
        players: activePlayers,
        startedBy: nickname,
        currentTurn: shuffled[0],
        message: `🎮 Game started by ${nickname} (${shuffled.join(", ")})`,
        round: 1,
      });

      setTimeout(() => {
        const firstSocket = findSocketByNickname(shuffled[0]);
        const startTime = Date.now();
        io.to(mode).emit("syncTimer", { mode, startTime });
        if (firstSocket) io.to(firstSocket).emit("yourTurn", { mode });
        console.log(`🕒 Timer started at ${new Date(startTime).toLocaleTimeString()}`);
      }, 500);

      waitingRooms[mode] = [];
    }, 3000);
  });


  // 💾 เก็บสถานะ lock แยกต่อ mode
  const roundLock = { easy: false, hard: false };

  /* 🔁 สลับเทิร์น (resume game หรือ auto-next) */
  socket.on("resumeGame", ({ mode }) => {
    const room = gameRooms[mode];
    if (!room) return;

    // ✅ ป้องกัน resume ซ้ำ
    if (roundLock[mode]) {
      console.log(`⚠️ [LOCKED] Resume for ${mode} ignored (still processing round ${room.rounds})`);
      return;
    }
    roundLock[mode] = true;

    // ถ้าผู้เล่นไม่พอ → จบเกม
    if (!room.players || room.players.length < 2) {
      console.log(`💀 Game in ${mode} ended — not enough players`);
      io.to(mode).emit("gameover", { reason: "not_enough_players" });
      delete gameRooms[mode];
      roundLock[mode] = false;
      return;
    }

    // ✅ เพิ่มตัวนับเทิร์น
    if (room.turnCount === undefined) room.turnCount = 0;
    room.turnCount += 1;

    // ✅ ครบรอบ → เพิ่มรอบใหม่
    if (room.turnCount >= room.turnOrder.length) {
      room.rounds += 1;
      room.turnCount = 0;
      console.log(`🏁 End of round ${room.rounds - 1} → starting round ${room.rounds}`);

      // 🧩 สร้างโจทย์ใหม่จาก server
      room.currentProblem = generateProblem(mode);
      io.to(mode).emit("newRound", {
        round: room.rounds,
        ...room.currentProblem,
      });
    }

    // 🔄 เปลี่ยนตาเล่น
    room.currentTurnIndex = (room.currentTurnIndex + 1) % room.turnOrder.length;
    const nextTurn = room.turnOrder[room.currentTurnIndex];
    room.currentTurn = nextTurn;

    console.log(`🔁 Switching turn to ${nextTurn} (Round ${room.rounds})`);

    io.to(mode).emit("turnSwitch", {
      nextTurn,
      currentTurnIndex: room.currentTurnIndex,
      round: room.rounds,
    });

    // 🕒 ให้ host sync timer ใหม่ (แค่ครั้งเดียวต่อรอบ)
    const hostName = room.turnOrder[0];
    const hostSocket = findSocketByNickname(hostName);
    if (hostSocket) {
      const startTime = Date.now();
      io.to(mode).emit("syncTimer", { mode, startTime });
      console.log(`🕒 Timer synced by host (${hostName}) for mode ${mode}`);
    }

    // ✅ ปลดล็อกหลัง 3 วินาที (กัน trigger ซ้ำจาก client อื่น)
    setTimeout(() => {
      roundLock[mode] = false;
      console.log(`🔓 [UNLOCK] ${mode} ready for next resume`);
    }, 3000);
  });

  /* 🧮 sync ผลลัพธ์จาก client */
  socket.on("answerResult", (data) => {
    if (!data.mode) return;
    const room = gameRooms[data.mode];
    if (!room) return;

    io.to(data.mode).emit("answerResult", data);


  });

  /* 🚪 ผู้เล่นออกกลางเกม */
  socket.on("playerLeftGame", ({ nickname, mode }) => {
    const room = gameRooms[mode];
    if (!room) return;

    console.log(`🚪 ${nickname} left ${mode}`);

    room.turnOrder = room.turnOrder.filter((n) => n !== nickname);
    room.players = room.players.filter((n) => n !== nickname);

    // ถ้าเหลือ < 2 → จบเกมเลย
    if (room.turnOrder.length < 2) {
      io.to(mode).emit("gameover", { reason: "not_enough_players" });
      delete gameRooms[mode];
      console.log("💀 Game ended (not enough players)");
      return;
    }

    // ถ้าออกตอนเป็นเทิร์นตัวเอง → ส่งต่อทันที
    if (room.currentTurn === nickname) {
      room.currentTurnIndex %= room.turnOrder.length;
      const nextTurn = room.turnOrder[room.currentTurnIndex];
      room.currentTurn = nextTurn;

      io.to(mode).emit("turnSwitch", {
        nextTurn,
        currentTurnIndex: room.currentTurnIndex,
      });

      const nextSocket = findSocketByNickname(nextTurn);
      if (nextSocket) io.to(nextSocket).emit("yourTurn", { mode });
    }
  });

  /* 🟡 ออกจาก lobby */
  socket.on("leaveLobby", (nickname) => {
    if (!nickname) return;
    if (players[socket.id]) {
      players[socket.id].isOnline = false;
      players[socket.id].mode = null;
    }
    console.log(`🚪 ${nickname} left lobby`);
    updatePlayerList();
  });

  /* 🔴 disconnect */
  socket.on("disconnect", () => {
    const player = players[socket.id];
    if (!player) return;

    console.log(`🔴 ${player.nickname} disconnected`);

    // เอาออกจาก waiting room ถ้ายังไม่ได้เริ่ม
    if (player.mode && waitingRooms[player.mode]) {
      waitingRooms[player.mode] = waitingRooms[player.mode].filter(
        (p) => p !== player.nickname
      );

      io.to(player.mode).emit("waitingList", {
        mode: player.mode,
        players: waitingRooms[player.mode],
      });
    }

    player.isOnline = false;
    updatePlayerList();
  });
});

/* 🧭 UPDATE PLAYER LIST --------------------------------------------- */
function updatePlayerList() {
  const list = Object.values(players)
    .filter((p) => p.isOnline)
    .map((p) => p.nickname);
  io.emit("playerList", list);
}

/* 🔍 FIND SOCKET BY NICKNAME ---------------------------------------- */
function findSocketByNickname(name) {
  return Object.keys(players).find((id) => players[id]?.nickname === name);
}

/* 🟢 START SERVER ---------------------------------------------------- */
server.listen(4000, () =>
  console.log("✅ Server running on port 4000 (multi-turn, rounds, and reconnect safe)")
);
