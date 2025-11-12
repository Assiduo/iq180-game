import { useEffect } from "react";
import { io } from "socket.io-client";
import { generateProblem } from "../utils/problemGenerator";

// ✅ Connect to backend server
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";
const socket = io(SERVER_URL, {
    autoConnect: true,
    transports: ["websocket", "polling"],
});

/**
 * Custom hook for game socket events
 * Handles all socket.io listeners and cleanup automatically
 */
export default function useGameSocket({
    nickname,
    mode,
    page,
    play,
    setPage,
    setPlayerList,
    setWaitingPlayers,
    setCanStart,
    setPreGameInfo,
    setCountdown,
    setShowCountdown,
    setDigits,
    setOperators,
    setDisabledOps,
    setTarget,
    setMode,
    setSolutionExpr,
    setGameState,
    setIsMyTurn,
    setRunning,
    setBaseTime,
    setTimeLeft,
    setExpression,
    setLastWasNumber,
    setLastWasSqrt,
    setResultPopup,
    setSolution,
    setScore,
    setRounds,
    setScores,
    setEndByName,
    setReactions,
    setLatestEmojiPopup,
    emojiTimeoutsRef,
    problemRef,
    stopTimer,
}) {
    useEffect(() => {
        if (!socket) return;

        // ✅ CONNECT
        socket.on("connect", () => {
            console.log("🟢 Connected to server");
            if (page === "mode" && nickname.trim()) {
                socket.emit("setNickname", nickname);
                console.log(`✅ ${nickname} marked as online`);
            }
        });

        // ✅ PLAYER LIST
        socket.on("playerList", (list) => {
            console.log("👥 Players online:", list);
            setPlayerList(list);
        });

        // ✅ WAITING LIST
        socket.on("waitingList", (data) => {
            if (data.mode === mode) {
                console.log(`🕹️ Waiting list for ${mode}:`, data.players);
                setWaitingPlayers(data.players);
            }
        });

        // ✅ READY STATE
        socket.on("canStart", (data) => {
            if (data.mode === mode) setCanStart(data.canStart);
        });

        // ✅ PRE-GAME COUNTDOWN
        socket.on("preGameStart", (data) => {
            console.log("⏳ Pre-game starting:", data);
            setPreGameInfo({
                mode: data.mode,
                starter: data.starter,
                players: data.players,
            });
            let counter = data.countdown;
            setCountdown(counter);
            setShowCountdown(true);
            const timer = setInterval(() => {
                counter -= 1;
                setCountdown(counter);
                if (counter <= 0) {
                    clearInterval(timer);
                    setShowCountdown(false);
                }
            }, 1000);
        });

        // ✅ GAME START
        socket.on("gameStart", (data) => {
            console.log("🚀 Game started from server:", data);
            setDigits(data.digits || []);
            setOperators(data.operators || []);
            setDisabledOps(data.disabledOps || []);
            setTarget(data.target || 0);
            setMode(data.mode || "easy");

            problemRef.current = {
                digits: data.digits || [],
                target: data.target || 0,
                disabledOps: data.disabledOps || [],
            };

            setGameState((prev) => ({
                ...prev,
                ...data,
                target: data.target || 0, // ✅ ensure target is synced in gameState
            }));

            const list =
                Array.isArray(data.players) && data.players.length > 0
                    ? data.players
                    : Array.isArray(data.turnOrder)
                      ? data.turnOrder
                      : [];
            const uniquePlayers = Array.from(new Set([...list, nickname]));
            setScores(Object.fromEntries(uniquePlayers.map((p) => [p, 0])));

            const myTurn = data.currentTurn === nickname;
            setIsMyTurn(myTurn);
            setPage("game");

            const duration = data.mode === "hard" ? 30 : 60;
            setTimeLeft(duration);
            setBaseTime(Date.now());
            setRunning(true);

            // Reset round state
            setExpression("");
            setLastWasNumber(false);
            setLastWasSqrt(false);
            setResultPopup(null);
            setSolution(null);
            setScore(0);
            setRounds(0);
        });

        // ✅ NEW ROUND
        socket.on("newRound", (data) => {
            console.log("🎯 New round data received:", data);

            // Fallback if target is missing
            const newTarget = data.target ?? problemRef.current.target ?? 0;

            setDigits(data.digits || []);
            setOperators(data.operators || []);
            setDisabledOps(data.disabledOps || []);
            setTarget(newTarget);
            setRounds(data.round);
            setExpression("");
            setLastWasNumber(false);
            setResultPopup(null);

            problemRef.current = {
                digits: data.digits || [],
                target: newTarget,
                disabledOps: data.disabledOps || [],
            };

            setSolutionExpr("");

            // Reset timer
            const duration = data.mode === "hard" ? 30 : 60;
            setTimeLeft(duration);
            setBaseTime(Date.now());
            setRunning(true);

            // ✅ Sync target with gameState
            setGameState((prev) => ({
                ...prev,
                ...data,
                target: newTarget,
            }));
        });

        // ✅ TURN SWITCH
        socket.on("turnSwitch", (data) => {
            console.log("🔁 Turn switched:", data);
            setGameState((prev) => ({
                ...prev,
                currentTurn: data.nextTurn,
                round: data.round ?? prev.round,
            }));
            setIsMyTurn(data.nextTurn === nickname);

            const duration = mode === "hard" ? 30 : 60;
            setTimeLeft(duration);
            setBaseTime(Date.now());
            setRunning(true);
        });

        // ✅ GAMEOVER
        socket.on("gameover", (data) => {
            console.log("💀 Game over:", data);
            setEndByName(data?.by || null);
            setResultPopup("gameover");
            stopTimer();
            setRunning(false);
        });

        // ✅ YOUR TURN
        socket.on("yourTurn", ({ mode }) => {
            console.log("🧩 It's now your turn to generate a problem!");
            const gameData = generateProblem(mode);

            setDigits(gameData.digits);
            setOperators(gameData.operators);
            setDisabledOps(gameData.disabledOps);
            setTarget(gameData.target);
            setMode(gameData.mode);

            problemRef.current = {
                digits: gameData.digits,
                target: gameData.target,
                disabledOps: gameData.disabledOps,
            };

            setBaseTime(Date.now());
            setRunning(true);
            setIsMyTurn(true);
            setExpression("");
            setLastWasNumber(false);
            setLastWasSqrt(false);
            setResultPopup(null);
            setSolution(null);
            setPage("game");

            // ✅ Update gameState for consistency
            setGameState((prev) => ({
                ...prev,
                currentTurn: nickname,
                target: gameData.target,
            }));

            // ✅ Broadcast new problem to others (optional, if backend supports it)
            socket.emit("newProblem", {
                mode,
                digits: gameData.digits,
                operators: gameData.operators,
                disabledOps: gameData.disabledOps,
                target: gameData.target,
            });
        });

        // ✅ ANSWER RESULT
        socket.on("answerResult", (data) => {
            console.log("📩 Answer result:", data);
            setScores((prev) => {
                const next = { ...prev };
                if (!(data.nickname in next)) next[data.nickname] = 0;
                if (data.correct) next[data.nickname] += 1;
                return next;
            });
            if (data.round !== undefined) setRounds(data.round);
        });

        // ✅ PLAYER LEFT
        socket.on("playerLeft", (data) => {
            console.log(`🚪 ${data.nickname} left ${data.mode}`);
            if (data.mode === mode) {
                setWaitingPlayers((prev) => prev.filter((p) => p !== data.nickname));
            }
        });

        // ✅ EMOJIS
        socket.on("playerEmoji", (payload) => {
            if (!payload || !payload.nickname || !payload.emoji) return;
            const { nickname: from, emoji, ts = Date.now() } = payload;
            setReactions((prev) => ({ ...prev, [from]: { emoji, ts } }));
            setLatestEmojiPopup({ emoji, from });
            setTimeout(() => setLatestEmojiPopup(null), 1600);
            if (emojiTimeoutsRef.current[from])
                clearTimeout(emojiTimeoutsRef.current[from]);
            emojiTimeoutsRef.current[from] = setTimeout(() => {
                setReactions((prev) => {
                    const next = { ...prev };
                    delete next[from];
                    return next;
                });
                delete emojiTimeoutsRef.current[from];
            }, 5000);
        });

        // ✅ CLEANUP
        return () => {
            [
                "connect",
                "playerList",
                "waitingList",
                "canStart",
                "preGameStart",
                "gameStart",
                "newRound",
                "turnSwitch",
                "yourTurn",
                "answerResult",
                "playerLeft",
                "playerEmoji",
                "gameover",
            ].forEach((e) => socket.off(e));

            Object.values(emojiTimeoutsRef.current || {}).forEach((t) => clearTimeout(t));
            emojiTimeoutsRef.current = {};
        };
    }, [nickname, page, mode]);

    return socket;
}
