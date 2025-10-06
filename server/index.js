import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

/* 🌍 GLOBAL STATE */
let players = {}; // { socket.id: { nickname, mode, isOnline } }
let waitingRooms = { easy: [], hard: [] };
let gameRooms = {}; // { mode: { players, turnOrder, currentTurnIndex, currentTurn, rounds } }

/* ⚙️ SOCKET EVENTS */
io.on("connection", (socket) => {
  console.log("🟢 Player connected:", socket.id);

  /* ✅ ตั้งชื่อ */
  socket.on("setNickname", (nickname) => {
    if (!nickname) return;
    players[socket.id] = { nickname, mode: null, isOnline: true };
    console.log(`👤 ${nickname} is now online`);
    updatePlayerList();
  });

  /* ✅ เข้าห้อง */
  socket.on("joinGame", ({ nickname, mode }) => {
    if (!nickname || !mode) return;

    // เอาออกจากห้องเก่าถ้ามี
    const old = players[socket.id];
    if (old?.mode) {
      waitingRooms[old.mode] = waitingRooms[old.mode].filter(
        (p) => p !== old.nickname
      );
    }

    players[socket.id] = { nickname, mode, isOnline: true };
    socket.join(mode);

    if (!waitingRooms[mode].includes(nickname))
      waitingRooms[mode].push(nickname);

    console.log(`👤 ${nickname} joined ${mode}`);
    io.to(mode).emit("waitingList", { mode, players: waitingRooms[mode] });
    updatePlayerList();

    if (waitingRooms[mode].length >= 2) {
      io.to(mode).emit("canStart", { mode, canStart: true });
    }
  });

  /* 🚀 เริ่มเกม */
  socket.on("startGame", ({ mode, nickname, gameData }) => {
    if (!mode || !nickname || !gameData) return;
    const activePlayers = [...waitingRooms[mode]];
    if (activePlayers.length < 2) return;

    console.log(`🚀 ${nickname} started ${mode} game with:`, activePlayers);

    // 🔀 สุ่มลำดับการเล่น (ครั้งเดียว)
    const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);
    const ROUND_TIME = 30; // หรือ 60 แล้วแต่โหมด
    let gameTimers = {}; // { mode: { timer, timeLeft } }
    
    function startTurnTimer(mode) {
      if (!gameRooms[mode]) return;
    
      clearInterval(gameTimers[mode]?.timer);
      gameTimers[mode] = { timeLeft: ROUND_TIME };
    
      gameTimers[mode].timer = setInterval(() => {
        gameTimers[mode].timeLeft -= 1;
    
        io.to(mode).emit("timeUpdate", {
          mode,
          timeLeft: gameTimers[mode].timeLeft,
        });
    
        if (gameTimers[mode].timeLeft <= 0) {
          clearInterval(gameTimers[mode].timer);
          io.to(mode).emit("timeout", { mode });
          // สลับคนเล่นอัตโนมัติเมื่อหมดเวลา
          io.to(mode).emit("resumeGame", { mode });
        }
      }, 1000);
    }
    
    // 🏠 สร้างห้องเกมใหม่
    gameRooms[mode] = {
      players: activePlayers,
      turnOrder: shuffled,
      currentTurnIndex: 0,
      currentTurn: shuffled[0],
      rounds: 1,
    };

    // ⏳ แจ้ง preGame ให้ทุกคนเห็น countdown
    io.to(mode).emit("preGameStart", {
      mode,
      players: activePlayers,
      starter: nickname,
      countdown: 3,
    });

    // ⏰ เริ่มเกมจริงหลัง countdown
    setTimeout(() => {
      io.to(mode).emit("gameStart", {
        ...gameData,
        players: activePlayers,
        startedBy: nickname,
        currentTurn: shuffled[0],
        message: `🎮 Game started by ${nickname} (${shuffled.join(", ")})`,
      });

      // ส่ง event "yourTurn" ให้คนเริ่ม
      const firstSocket = findSocketByNickname(shuffled[0]);
      if (firstSocket) io.to(firstSocket).emit("yourTurn", { mode });
      startTurnTimer(mode);

      waitingRooms[mode] = [];
    }, 3000);
  });

/* 🔁 สลับเทิร์น (resume game หรือ auto-next) */
socket.on("resumeGame", ({ mode }) => {
  const room = gameRooms[mode];
  if (!room) return;

  // หมุน index ไปคนถัดไป
  room.currentTurnIndex = (room.currentTurnIndex + 1) % room.turnOrder.length;
  const nextTurn = room.turnOrder[room.currentTurnIndex];
  room.currentTurn = nextTurn;

  console.log(`🔁 Switching turn to ${nextTurn} (Round ${room.rounds || 1})`);

  // แจ้งทุก client ว่าเทิร์นเปลี่ยนแล้ว
  io.to(mode).emit("turnSwitch", {
    nextTurn,
    currentTurnIndex: room.currentTurnIndex,
    round: room.rounds || 1,
  });

  // หา socket ของคนที่จะเล่นคนต่อไป
  const nextSocket = findSocketByNickname(nextTurn);
  if (nextSocket) {
    io.to(nextSocket).emit("yourTurn", { mode });

    // 🕒 ให้ host (หรือ player 1) sync timer ใหม่ให้ทุกคน
    const hostName = room.turnOrder[0];
    const hostSocket = findSocketByNickname(hostName);
    if (hostSocket) {
      const startTime = Date.now();
      io.to(mode).emit("syncTimer", { mode, startTime });
      console.log(`🕒 Timer synced by host (${hostName}) for mode ${mode}`);
    }
  }
});


  /* 🧮 sync ผลลัพธ์ (จาก client) */
  socket.on("answerResult", (data) => {
    if (!data.mode) return;
    const room = gameRooms[data.mode];
    if (!room) return;

    // ✅ Broadcast ผลให้ทุกคนเห็น
    io.to(data.mode).emit("answerResult", data);

    // 🏁 เช็คว่าครบรอบหรือยัง
    const nextIndex = (room.currentTurnIndex + 1) % room.turnOrder.length;
    if (nextIndex === 0) {
      room.rounds += 1;
      io.to(data.mode).emit("endRound", { round: room.rounds });
      console.log(`🏁 End of round ${room.rounds - 1} → starting new round`);
    }
  });

  /* 🚪 ผู้เล่นออกกลางเกม */
  socket.on("playerLeftGame", ({ nickname, mode }) => {
    const room = gameRooms[mode];
    if (!room) return;

    console.log(`🚪 ${nickname} left ${mode}`);

    // เอาออกจากลิสต์ผู้เล่น
    room.turnOrder = room.turnOrder.filter((n) => n !== nickname);
    room.players = room.players.filter((n) => n !== nickname);

    // 💀 ถ้าเหลือ < 2 ให้จบเกม
    if (room.turnOrder.length < 2) {
      io.to(mode).emit("gameover", { reason: "not_enough_players" });
      delete gameRooms[mode];
      console.log("💀 Game ended (not enough players)");
      return;
    }

    // 🔁 ถ้าออกตอนเป็นเทิร์นของตัวเอง → ส่งต่อทันที
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

/* 🧭 broadcast รายชื่อผู้เล่นทั้งหมด */
function updatePlayerList() {
  const list = Object.values(players)
    .filter((p) => p.isOnline)
    .map((p) => p.nickname);
  io.emit("playerList", list);
}

/* 🔍 หาช่องจาก nickname */
function findSocketByNickname(name) {
  return Object.keys(players).find((id) => players[id]?.nickname === name);
}

server.listen(4000, () =>
  console.log("✅ Server running on port 4000 (multi-turn, rounds, and reconnect safe)")
);
