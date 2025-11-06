import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

/* 🚀 INITIAL SETUP -------------------------------------------------- */
const app = express();
app.use(cors());

const gameTimers = {};
const roundLock = { easy: false, hard: false };


const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

/* 🌍 GLOBAL STATE ---------------------------------------------------- */
let players = {}; // { socket.id: { nickname, mode, isOnline } }
let waitingRooms = { easy: [], hard: [] };
let gameRooms = {}; // { mode: { players, turnOrder, currentTurnIndex, currentTurn, rounds } }
// 🏆 Global personal bests (nickname → highest score)
const personalBests = {};

/* ⚙️ SOCKET EVENTS --------------------------------------------------- */
function createExpressionWithResult(numbers, ops, mode, disabledOps = []) {
    // 🎲 สุ่มลำดับตัวเลข (Fisher–Yates)
    const shuffle = (array) => {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    };

    const nums = shuffle([...numbers]);
    const allowedOps = ops.filter((op) => !disabledOps.includes(op));
    const canPlaceRootAfter = ["+", "-", "×", "÷", "(", ""];

    // ✅ ใช้รูทเฉพาะเมื่อมีเลข 1,4,9
    const hasPerfectSquare = nums.some((n) => [1, 4, 9].includes(n));
    const baseAllowRoot = mode === "hard" && hasPerfectSquare && allowedOps.includes("√");

    let expr = "";
    let result = 0;
    let attempts = 0;
    let allowRoot = baseAllowRoot;

    // 🔁 ฟังก์ชันสร้าง expression เดียว
    function tryGenerateExpression() {
        expr = "";
        result = 0;
        let openParen = 0;
        let prev = "";

        for (let i = 0; i < nums.length; i++) {
            // 🔹 เปิดวงเล็บสุ่ม
            if (mode === "hard" && Math.random() < 0.25 && openParen === 0 && i < nums.length - 2) {
                expr += "(";
                openParen++;
                prev = "(";
            }

            // 🔹 เพิ่มรูทเฉพาะจุดที่ถูกต้อง
            if (
                allowRoot &&
                Math.random() < 0.5 &&
                canPlaceRootAfter.includes(prev) &&
                [1, 4, 9].includes(nums[i])
            ) {
                expr += "√";
                prev = "√";
            }

            expr += nums[i];
            prev = nums[i];

            // 🔹 ปิดวงเล็บสุ่มบางครั้ง
            if (mode === "hard" && openParen > 0 && Math.random() < 0.3 && i > 1) {
                expr += ")";
                openParen--;
                prev = ")";
            }

            // 🔹 เพิ่ม operator (ห้ามซ้ำ)
            if (i < nums.length - 1) {
                let op = allowedOps[Math.floor(Math.random() * allowedOps.length)];
                while (/[+\-×÷]/.test(prev) && /[+\-×÷]/.test(op)) {
                    op = allowedOps[Math.floor(Math.random() * allowedOps.length)];
                }
                expr += op;
                prev = op;
            }
        }

        // 🔹 ปิดวงเล็บค้าง
        while (openParen > 0) {
            expr += ")";
            openParen--;
        }

        // ❌ ข้าม expression ผิดหลัก
        if (/[\+\-×÷]{2,}/.test(expr)) return false;
        if (/√√/.test(expr)) return false;
        if (/\(\)/.test(expr)) return false;
        if (/\d√/.test(expr)) return false;
        if (/\)√/.test(expr)) return false;

        try {
            const clean = expr
                .replace(/×/g, "*")
                .replace(/÷/g, "/")
                .replace(/√(\d+|\([^()]+\))/g, "Math.sqrt($1)");

            result = eval(clean);

            // 🧮 ตรวจรูท — ต้องถอดรากลงตัว
            if (expr.includes("√")) {
                const invalidRoot = /√(\d+)/g;
                let match;
                while ((match = invalidRoot.exec(expr)) !== null) {
                    const n = parseInt(match[1]);
                    if (Math.sqrt(n) % 1 !== 0) return false; // ❌ ถ้าไม่ใช่ perfect square
                }
            }

            // ❌ reject ถ้าไม่ใช่ integer
            if (!Number.isFinite(result) || !Number.isInteger(result) || result <= 0) {
                return false;
            }
        } catch {
            return false;
        }

        return true;
    }

    // 🌀 พยายามสร้างโจทย์ที่ถูกหลัก
    while ((!Number.isFinite(result) || !Number.isInteger(result) || result <= 0) && attempts < 800) {
        attempts++;
        if (tryGenerateExpression()) break;
    }

    // 🔁 ถ้ายังไม่ได้ → ปิดรูทแล้วลองใหม่
    if (!Number.isInteger(result) || result <= 0) {
        allowRoot = false;
        for (let i = 0; i < 400; i++) {
            if (tryGenerateExpression()) break;
        }
    }

    // 🔒 fallback สุดท้าย (ไม่มีวันพัง)
    if (!Number.isFinite(result) || !Number.isInteger(result) || result <= 0) {
        expr = `${nums[0]}+${nums[1]}`;
        result = nums[0] + nums[1];
    }

    return { expr, result };
}

function generateProblem(mode) {
    const nums = Array.from({ length: 9 }, (_, i) => i + 1);

    let selected = [];
    while (selected.length < 5) {
        const idx = Math.floor(Math.random() * nums.length);
        selected.push(nums.splice(idx, 1)[0]);
    }

    const baseOps = ["+", "-", "×", "÷"];
    const dis = [];

    // 🔹 disable 2 operators ใน Genius mode (แบบสุ่ม)
    if (mode === "hard") {
        while (dis.length < 2) {
            const op = baseOps[Math.floor(Math.random() * baseOps.length)];
            if (!dis.includes(op)) dis.push(op);
        }
    }

    // 🔹 allowed ops
    const allOps = mode === "hard" ? baseOps.concat(["√", "(", ")"]) : baseOps;

    let expr = "";
    let result = 0;
    let attempts = 0;

    // 🔁 loop จนได้จำนวนเต็มจริง
    while ((!Number.isFinite(result) || !Number.isInteger(result) || result <= 0) && attempts < 1000) {
        attempts++;
        const problem = createExpressionWithResult(selected, allOps, mode, dis);
        expr = problem.expr;
        result = problem.result;
    }

    // ✅ fallback ปลอดภัยสุดท้าย
    if (!Number.isFinite(result) || !Number.isInteger(result) || result <= 0) {
        expr = `${selected[0]}+${selected[1]}`;
        result = selected[0] + selected[1];
    }

    return {
        digits: selected,
        operators: allOps,
        disabledOps: dis,
        target: result, // ✅ ไม่ต้องปัด เพราะเป็น integer อยู่แล้ว
        expr,
        mode,
    };
    const problem = generateProblem(mode);
    console.log("🧩 Generated:", problem.expr, "=", problem.target);

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
        const ROUND_TIME = 30000;

        gameRooms[mode] = {
            players: activePlayers,
            turnOrder: shuffled,
            currentTurnIndex: 0,
            currentTurn: shuffled[0],
            rounds: 1,
            currentProblem: generateProblem(mode), // ✅ สร้างโจทย์แรก
            answers: [], // ✅ เก็บคำตอบและเวลาในแต่ละรอบ
        };
        roundTemp: {} // store { [nickname]: { correct: bool, timeMs: number } }


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
            io.to(roomId).emit("gameStart", problem);
            console.log("🚀 Sent expr to client:", problem.expr);


            // ✅   คำนวนคะแนนตามคนตอบไวสุด
            const startTime = Date.now();
            gameRooms[mode].startTime = startTime;

            setTimeout(() => {
                const firstSocket = findSocketByNickname(shuffled[0]);
                const startTime = Date.now();
                io.to(mode).emit("syncTimer", { mode, startTime });
                if (firstSocket) io.to(firstSocket).emit("yourTurn", { mode });
                console.log(`🕒 Timer started at ${new Date(startTime).toLocaleTimeString()}`);

                // ⏱️ Start auto-turn switch when time runs out
            if (gameTimers[mode]) clearTimeout(gameTimers[mode]);
            gameTimers[mode] = setTimeout(() => {
            console.log(`⏰ Time up! Auto-switching turn in ${mode}`);
            io.to(mode).emit("timeUp", { mode }); // optional event for UI
            resumeGameHandler(mode);
            }, ROUND_TIME);
            }, 500);

            waitingRooms[mode] = [];
        }, 3000);
    });

function resumeGameHandler(mode) {
  const room = gameRooms[mode];
  if (!room) return;

  if (roundLock[mode]) {
    console.log(`⚠️ [LOCKED] Resume for ${mode} ignored (still processing round ${room.rounds})`);
    return;
  }
  roundLock[mode] = true;

  // 🧩 Switch player turn
  room.currentTurnIndex = (room.currentTurnIndex + 1) % room.turnOrder.length;
  const isNewRound = room.currentTurnIndex === 0;
  if (isNewRound) room.rounds += 1;

  room.currentTurn = room.turnOrder[room.currentTurnIndex];

  console.log(`🔁 Switching turn to ${room.currentTurn} (Round ${room.rounds})`);
  io.to(mode).emit("turnSwitch", {
    nextTurn: room.currentTurn,
    currentTurnIndex: room.currentTurnIndex,
    round: room.rounds,
  });

  // 🎯 Notify next player
  const nextSocket = findSocketByNickname(room.currentTurn);
  if (nextSocket) io.to(nextSocket).emit("yourTurn", { mode });

  // 🕒 Reset timer every turn
  if (gameTimers[mode]) {
    clearTimeout(gameTimers[mode]);
  }

  const startTime = Date.now();
  room.startTime = startTime;
  io.to(mode).emit("syncTimer", { mode, startTime });
  console.log(`🕒 Timer reset for ${mode} — ${room.currentTurn}'s turn`);

  // 🔁 Schedule next automatic turn switch after 30s
  gameTimers[mode] = setTimeout(() => {
    console.log(`⏰ Time up! Auto-switching turn in ${mode}`);
    io.to(mode).emit("timeUp", { mode });
    resumeGameHandler(mode);
  }, 60000);

  // 🔓 Unlock after short delay to avoid overlap
  setTimeout(() => {
    roundLock[mode] = false;
    console.log(`🔓 [UNLOCK] ${mode} ready for next resume`);
  }, 2000);
}


    // 💾 เก็บสถานะ lock แยกต่อ mode

    socket.on("resumeGame", ({ mode }) => resumeGameHandler(mode));

    /* 🧮 sync ผลลัพธ์จาก client */
    socket.on("answerResult", (data) => {
        const room = gameRooms[data.mode];
        if (!room) return;

        // ⏱️ คำนวณเวลาตอบ (วินาที)
        const timeTaken = (Date.now() - (room.startTime || Date.now())) / 1000;

        // ✅ เก็บข้อมูลการตอบในรอบนี้
        room.answers.push({
            player: data.nickname,
            correct: data.correct,
            time: timeTaken,
        });

        console.log(
            `🧩 ${data.nickname} answered ${data.correct ? "✅ CORRECT" : "❌ WRONG"} in ${timeTaken.toFixed(2)}s`
        );

        // 🧮 เมื่อครบทุกคนตอบแล้ว
        if (room.answers.length >= room.players.length) {
            const correctOnes = room.answers.filter((a) => a.correct);
            if (correctOnes.length > 0) {
                // หาคนที่ตอบเร็วที่สุด
                const winner = correctOnes.reduce((a, b) => (a.time < b.time ? a : b));
                console.log(`🏆 Fastest correct: ${winner.player} (${winner.time.toFixed(2)}s)`);

                // ✅ เพิ่มคะแนนให้ผู้ชนะ
                room.scores = room.scores || {};
                room.players.forEach((p) => {
                    if (!room.scores[p]) room.scores[p] = 0;
                });
                room.scores[winner.player] += 1;
                // 🏆 Update personal best if this is higher
                const nickname = winner.player;
                const newScore = room.scores[nickname];
                if (!personalBests[nickname] || newScore > personalBests[nickname]) {
                    personalBests[nickname] = newScore;
                    console.log(`🏅 New personal best for ${nickname}: ${newScore}`);
                }

                io.to(data.mode).emit("roundResult", {
                    winner: winner.player,
                    scores: room.scores,
                    answers: room.answers,
                });
            } else {
                // ❌ ไม่มีใครตอบถูก
                io.to(data.mode).emit("roundResult", {
                    winner: null,
                    scores: room.scores || {},
                    answers: room.answers,
                });
            }

            // ✅ เตรียมรอบใหม่
            room.answers = [];
            
        }
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
    // 🎭 Reaction event (simple emoji reactions between players)
    socket.on("reaction", (data) => {
        const { mode, emoji, nickname } = data;
        console.log(`🎭 ${nickname} reacted with ${emoji} in mode ${mode}`);
        io.to(mode).emit("reaction", { emoji, from: nickname });
    });

    // 🔍 When a client asks for their personal best
    socket.on("getPersonalBest", (data) => {
        const { nickname } = data;
        const best = personalBests[nickname] || 0;
        socket.emit("personalBest", { nickname, best });
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

