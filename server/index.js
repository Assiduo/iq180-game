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
let gameRooms = {}; // { mode: { players, turnOrder, currentTurnIndex, currentTurn, rounds, currentProblem, turnCount, mode } }

// timers per mode (keeps timeout refs)
const gameTimers = {}; // { mode: timeoutId }

/* 🧰 ADMIN API (ADD HERE) ------------------------------------------- */
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
                      turnCount: r.turnCount,
                      currentProblem: {
                          digits: r.currentProblem?.digits,
                          operators: r.currentProblem?.operators,
                          disabledOps: r.currentProblem?.disabledOps,
                          target: r.currentProblem?.target,
                          solutionExpr: r.currentProblem?.solutionExpr,
                          solutionResult: r.currentProblem?.solutionResult,
                      },
                  }
                : null,
        ])
    );

    res.json({ onlineCount: online.length, online, rooms });
});

// Inspect specific room (full snapshot) for debugging
app.get("/admin/room/:mode", (req, res) => {
    const mode = req.params.mode;
    const room = gameRooms[mode];
    if (!room) return res.status(404).json({ error: "room_not_found" });
    res.json({
        players: room.players,
        turnOrder: room.turnOrder,
        currentTurnIndex: room.currentTurnIndex,
        currentTurn: room.currentTurn,
        rounds: room.rounds,
        turnCount: room.turnCount,
        mode: room.mode,
        currentProblem: room.currentProblem,
    });
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
        // explicit naming for clarity (server-side canonical)
        solutionExpr: expr,
        solutionResult: result,
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
const roundLock = { easy: false, hard: false };

function clearModeTimer(mode) {
    if (gameTimers[mode]) {
        clearTimeout(gameTimers[mode]);
        delete gameTimers[mode];
    }
}

function scheduleAutoSwitch(mode, roundTime = 60) {
    clearModeTimer(mode);
    console.log(`⏱️ [${mode}] scheduleAutoSwitch for ${roundTime}s`);
    gameTimers[mode] = setTimeout(() => {
        console.log(`⏰ [${mode}] Auto-switch (time up)`);
        nextTurn(mode);
    }, roundTime * 1000);
}

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
            console.log(`💀 [${mode}] Ending game: not enough players`);
            delete gameRooms[mode];
            clearModeTimer(mode);
            return;
        }

        // increment turn count & maybe new round
        room.turnCount = (room.turnCount || 0) + 1;
        console.log(
            `🔁 [${mode}] turnCount -> ${room.turnCount} (turnOrder.length=${room.turnOrder.length})`
        );

        if (room.turnCount >= room.turnOrder.length) {
            room.rounds = (room.rounds || 1) + 1;
            room.turnCount = 0;
            // generate and store problem with solution fields
            room.currentProblem = generateProblem(mode);
            io.to(mode).emit("newRound", {
                round: room.rounds,
                ...room.currentProblem,
            });
            console.log(
                `🏁 [${mode}] New round ${room.rounds} generated — target=${room.currentProblem.target} | solution=${room.currentProblem.solutionExpr} = ${room.currentProblem.solutionResult}`
            );
            console.log(
                `📦 [${mode}] room snapshot:`,
                JSON.stringify({
                    rounds: room.rounds,
                    currentTurnIndex: room.currentTurnIndex,
                    turnCount: room.turnCount,
                    turnOrder: room.turnOrder,
                    players: room.players,
                    currentProblem: {
                        target: room.currentProblem.target,
                        solutionExpr: room.currentProblem.solutionExpr,
                        solutionResult: room.currentProblem.solutionResult,
                    },
                })
            );
        }

        // advance index & pick next player
        room.currentTurnIndex =
            ((room.currentTurnIndex || 0) + 1) % room.turnOrder.length;
        const nextPlayer = room.turnOrder[room.currentTurnIndex];
        room.currentTurn = nextPlayer;

        // emit turnSwitch
        io.to(mode).emit("turnSwitch", {
            nextTurn: nextPlayer,
            currentTurnIndex: room.currentTurnIndex,
            round: room.rounds,
        });

        console.log(
            `➡️ [${mode}] turnSwitch -> next: ${nextPlayer} (idx=${room.currentTurnIndex}) | round=${room.rounds}`
        );

        // emit syncTimer to all clients with a startTime
        const startTime = Date.now();
        const roundTime = room.mode === "hard" ? 30 : 60;
        io.to(mode).emit("syncTimer", { mode, startTime });
        console.log(
            `🕒 [${mode}] syncTimer emitted (start: ${new Date(startTime).toLocaleTimeString()}) for player ${nextPlayer}`
        );

        // notify the next player's socket to begin their UI turn
        const nextSocketId = findSocketIdByNickname(nextPlayer);
        if (nextSocketId) {
            io.to(nextSocketId).emit("yourTurn", { mode });
            console.log(
                `📣 [${mode}] yourTurn emitted to socket ${nextSocketId} (${nextPlayer})`
            );
        } else {
            console.log(`⚠️ [${mode}] No socket found for next player ${nextPlayer}`);
        }

        // restart auto-switch timer for the next turn
        scheduleAutoSwitch(mode, room.mode === "hard" ? 30 : 60);
    } finally {
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
        const old = players[socket.id];
        if (old?.mode && waitingRooms[old.mode]) {
            waitingRooms[old.mode] = waitingRooms[old.mode].filter(
                (p) => p !== old.nickname
            );
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
            currentProblem: {
                ...firstProblem,
            },
            turnCount: 0,
            mode,
            answers: [],
            problemGenerated: true,
        };

        console.log(
            `🎮 [${mode}] game created: round=1 | starter=${nickname} | firstTurn=${shuffled[0]} | target=${firstProblem.target} | solution=${firstProblem.solutionExpr} = ${firstProblem.solutionResult}`
        );
        console.log(
            `📦 [${mode}] initial room snapshot:`,
            JSON.stringify({
                players: gameRooms[mode].players,
                turnOrder: gameRooms[mode].turnOrder,
                rounds: gameRooms[mode].rounds,
                currentProblem: {
                    target: firstProblem.target,
                    solutionExpr: firstProblem.solutionExpr,
                    solutionResult: firstProblem.solutionResult,
                },
            })
        );

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
                solutionExpr: firstProblem.solutionExpr,
                solutionResult: firstProblem.solutionResult,
            });

            console.log(
                `▶️ [${mode}] gameStart emitted | round=1 | currentTurn=${shuffled[0]} | target=${firstProblem.target} | solution=${firstProblem.solutionExpr} = ${firstProblem.solutionResult}`
            );

            setTimeout(() => {
                const startTime = Date.now();
                io.to(mode).emit("syncTimer", { mode, startTime });

                const firstSocketId = findSocketIdByNickname(shuffled[0]);
                if (firstSocketId) {
                    io.to(firstSocketId).emit("yourTurn", { mode });
                    console.log(
                        `📣 [${mode}] yourTurn -> ${firstSocketId} (${shuffled[0]})`
                    );
                }

                scheduleAutoSwitch(mode, gameRooms[mode].mode === "hard" ? 30 : 60);
                waitingRooms[mode] = [];
                updatePlayerList();
            }, 500);
        }, 3000);
    });

    // client triggers resume (e.g., after answer popup) -> server advances
    socket.on("resumeGame", ({ mode }) => {
        if (!mode) return;
        console.log(`⏯️ resumeGame requested for mode=${mode} by socket ${socket.id}`);
        nextTurn(mode);
    });

    // answer result sync from clients
    socket.on("answerResult", (data) => {
        if (!data?.mode) return;
        const room = gameRooms[data.mode];
        if (!room) return;

        const problem = room.currentProblem;
        const correctExpr = problem?.solutionExpr || problem?.expr || null;
        const correctResult = problem?.solutionResult || problem?.target || null;

        // compute correctness
        let correct = false;
        try {
            if (data.result != null) {
                correct = Math.abs(data.result - correctResult) < 1e-9;
            }
        } catch {}

        io.to(data.mode).emit("answerResult", {
            ...data,
            correct,
            solutionExpr: correctExpr,       // ⭐ ALWAYS SEND SOLUTION
            solutionResult: correctResult,
        });

        console.log(
            `✅ [${data.mode}] answerResult: ${data.nickname} | correct=${correct} | solution=${correctExpr} = ${correctResult}`
        );
    });


    socket.on("playerLeftGame", ({ nickname, mode }) => {
        const room = gameRooms[mode];
        if (!room) return;
        console.log(`🚪 ${nickname} left ${mode}`);

        room.turnOrder = room.turnOrder.filter((n) => n !== nickname);
        room.players = room.players.filter((n) => n !== nickname);

        console.log(
            `📦 [${mode}] after leave — players=${room.players.length} | turnOrder=${room.turnOrder.length}`
        );

        if (room.turnOrder.length < 2) {
            io.to(mode).emit("gameover", { reason: "not_enough_players" });
            delete gameRooms[mode];
            clearModeTimer(mode);
            console.log("💀 Game ended (not enough players)");
            return;
        }

        if (room.currentTurn === nickname) {
            room.currentTurnIndex = room.currentTurnIndex % room.turnOrder.length;
            const nextTurnName = room.turnOrder[room.currentTurnIndex];
            room.currentTurn = nextTurnName;

            io.to(mode).emit("turnSwitch", {
                nextTurn: nextTurnName,
                currentTurnIndex: room.currentTurnIndex,
                round: room.rounds,
            });

            console.log(
                `➡️ [${mode}] playerLeft triggered turnSwitch -> next: ${nextTurnName} | round=${room.rounds}`
            );

            const nextSocket = findSocketIdByNickname(nextTurnName);
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

    socket.on("disconnect", () => {
        const player = players[socket.id];
        if (!player) return;

        console.log(`🔴 ${player.nickname} disconnected (${socket.id})`);

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

    socket.on("playerEmoji", (payload) => {
        if (!payload || !payload.nickname || !payload.emoji) return;

        const p = players[socket.id];
        const room = p?.mode || null;

        if (room) {
            io.to(room).emit("playerEmoji", payload);
            console.log(
                `💬 [emoji] ${payload.nickname} -> room ${room}: ${payload.emoji}`
            );
        } else {
            io.emit("playerEmoji", payload);
            console.log(`💬 [emoji] ${payload.nickname} -> all: ${payload.emoji}`);
        }
    });
});

/* 🟢 START SERVER ---------------------------------------------------- */
const PORT = process.env.PORT || 4000;
server.listen(PORT, () =>
    console.log(`✅ Server running on port ${PORT} (multi-turn, rounds, reconnect safe)`)
);
