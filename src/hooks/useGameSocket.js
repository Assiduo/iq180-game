import { useEffect } from "react";
import { io } from "socket.io-client";
import { generateProblem } from "../utils/problemGenerator";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://10.203.228.80:4000";
const socket = io(SERVER_URL, {
  autoConnect: true,
  transports: ["websocket", "polling"],
});

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
  stopTimer, // use the one passed in (do NOT shadow it)
}) {
  useEffect(() => {
    if (!socket) return;

    const now = () => new Date().toISOString();

    // CONNECT
    socket.on("connect", () => {
      console.log(now(), "🟢 Connected to server", { id: socket.id });
      if (page === "mode" && nickname?.trim()) {
        socket.emit("setNickname", nickname);
        console.log(now(), `✅ ${nickname} marked as online`);
      }
    });

    // PLAYER LIST
    socket.on("playerList", (list) => {
      console.log(now(), "👥 Players online:", list);
      setPlayerList(list);
    });

    // WAITING LIST
    socket.on("waitingList", (data) => {
      if (data.mode === mode) {
        console.log(now(), `🕹️ Waiting list for ${mode}:`, data.players);
        setWaitingPlayers(data.players);
      }
    });

    // READY STATE
    socket.on("canStart", (data) => {
      if (data.mode === mode) {
        console.log(now(), `✅ canStart for ${data.mode}:`, data.canStart);
        setCanStart(data.canStart);
      }
    });

    // PRE-GAME COUNTDOWN
    socket.on("preGameStart", (data) => {
      console.log(now(), "⏳ Pre-game starting:", data);
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

    // GAME START (server authoritative)
    socket.on("gameStart", (data) => {
      console.log(now(), "🚀 gameStart from server:", data);

      setDigits(data.digits || []);
      setOperators(data.operators || []);
      setDisabledOps(data.disabledOps || []);
      setTarget(data.target || 0);
      setMode(data.mode || "easy");

      // store server problem in problemRef (server canonical)
      problemRef.current = {
        digits: data.digits || [],
        target: data.target || 0,
        disabledOps: data.disabledOps || [],
        solutionExpr: data.solutionExpr,
        solutionResult: data.solutionResult,
      };

      // Save server-provided solution expr (UI can hide)
      setSolutionExpr(data.solutionExpr ?? "");
      if (data.solutionResult !== undefined) setSolution(data.solutionResult);

      // Ensure gameState contains authoritative round and target
      setGameState((prev) => ({
        ...prev,
        ...data,
        target: data.target || 0,
        round: data.round ?? prev.round ?? 0,
        currentTurn: data.currentTurn ?? prev.currentTurn,
      }));

      // keep rounds in sync deterministically
      setRounds((prev) => (data.round ?? prev ?? 0));

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
      setScore(0);
      // solution state already set above
    });

    // NEW ROUND (server authoritative)
    socket.on("newRound", (data) => {
      console.log(now(), "🎯 newRound received:", data);

      // authoritative server target (fallback to existing problemRef if missing)
      const newTarget = data.target ?? problemRef.current?.target ?? 0;

      setDigits(data.digits || []);
      setOperators(data.operators || []);
      setDisabledOps(data.disabledOps || []);
      setTarget(newTarget);

      // Sync rounds deterministically with debug log
      setRounds((prev) => {
        const next = data.round ?? prev ?? 0;
        console.log(now(), "→ setRounds:", { prev, next });
        return next;
      });

      setExpression("");
      setLastWasNumber(false);
      setResultPopup(null);

      // store server problem as canonical
      problemRef.current = {
        digits: data.digits || [],
        target: newTarget,
        disabledOps: data.disabledOps || [],
        solutionExpr: data.solutionExpr,
        solutionResult: data.solutionResult,
      };

      // Save server-provided solution expr (UI can decide to show/hide)
      setSolutionExpr(data.solutionExpr ?? "");
      if (data.solutionResult !== undefined) setSolution(data.solutionResult);

      setSolutionExpr(data.solutionExpr ?? "");

      // Reset timer
      const duration = data.mode === "hard" ? 30 : 60;
      setTimeLeft(duration);
      setBaseTime(Date.now());
      setRunning(true);

      // Sync to gameState too (single source: gameState.round)
      setGameState((prev) => ({
        ...prev,
        ...data,
        target: newTarget,
        round: data.round ?? prev.round ?? 0,
      }));
    });

    // TURN SWITCH
    socket.on("turnSwitch", (data) => {
      console.log(now(), "🔁 turnSwitch:", data);
      setGameState((prev) => ({
        ...prev,
        currentTurn: data.nextTurn,
        // do not overwrite round with undefined; preserve prev if missing
        round: data.round ?? prev.round,
      }));

      // keep local turns consistent
      setIsMyTurn(data.nextTurn === nickname);

      const duration = mode === "hard" ? 30 : 60;
      setTimeLeft(duration);
      setBaseTime(Date.now());
      setRunning(true);

      // If turnSwitch also carries round, sync rounds
      if (data.round !== undefined) {
        setRounds(data.round);
      }
    });

    // GAMEOVER
    socket.on("gameover", (data) => {
      console.log(now(), "💀 gameover:", data);
      setEndByName(data?.by ?? null);
      setResultPopup("gameover");
      // call the external stopTimer (passed in), do not shadow it
      if (typeof stopTimer === "function") stopTimer();
      setRunning(false);
    });

    // YOUR TURN — client fallback only if server hasn't provided a problem
    socket.on("yourTurn", ({ mode: serverMode }) => {
      console.log(now(), "🧩 yourTurn event from server:", { serverMode });

      // If server already provided a problem and stored it in problemRef, do NOT overwrite it.
      const hasServerProblem = !!(problemRef.current && problemRef.current.target !== undefined && problemRef.current.target !== null);
      if (hasServerProblem) {
        console.log(now(), "ℹ️ Server problem already present — not generating locally.", problemRef.current);
        // turn UI on
        setIsMyTurn(true);
        setPage("game");
        setBaseTime(Date.now());
        setRunning(true);
        setExpression("");
        setLastWasNumber(false);
        setLastWasSqrt(false);
        setResultPopup(null);
        setSolution(null); // solution is already in problemRef if present
        return;
      }

      // fallback: generate a local problem only if server didn't provide one
      console.log(now(), "⚠️ No server problem found — generating fallback locally");
      const gameData = generateProblem(serverMode);

      setDigits(gameData.digits);
      setOperators(gameData.operators);
      setDisabledOps(gameData.disabledOps);
      setTarget(gameData.target);
      setMode(gameData.mode);

      problemRef.current = {
        digits: gameData.digits,
        target: gameData.target,
        disabledOps: gameData.disabledOps,
        solutionExpr: gameData.expr,
        solutionResult: gameData.target,
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

      setGameState((prev) => ({
        ...prev,
        currentTurn: nickname,
        target: gameData.target,
      }));

      // optional: notify server of the fallback proposal (server needs to accept it)
      socket.emit("newProblemProposal", {
        mode: serverMode,
        digits: gameData.digits,
        operators: gameData.operators,
        disabledOps: gameData.disabledOps,
        target: gameData.target,
        solutionExpr: gameData.expr,
        solutionResult: gameData.target,
      });
    });

    socket.on("answerResult", (data) => {
      console.log(now(), "📩 answerResult:", data);
      setScores((prev) => {
        const next = { ...prev };
        if (!(data.nickname in next)) next[data.nickname] = 0;
        if (data.correct) next[data.nickname] += 1;
        return next;
      });
      if (data.round !== undefined) {
        setRounds(data.round);
        setGameState((prev) => ({ ...prev, round: data.round }));
      }

      if (data.solutionExpr !== undefined) setSolutionExpr(data.solutionExpr);
      if (data.solutionResult !== undefined) setSolution(data.solutionResult);
    });

    socket.on("playerLeft", (data) => {
      console.log(now(), `🚪 playerLeft: ${data.nickname} left ${data.mode}`);
      if (data.mode === mode) {
        setWaitingPlayers((prev) => prev.filter((p) => p !== data.nickname));
      }
    });

    // PLAYER EMOJI
    socket.on("playerEmoji", (payload) => {
      if (!payload || !payload.nickname || !payload.emoji) return;
      const { nickname: from, emoji, ts = Date.now() } = payload;
      setReactions((prev) => ({ ...prev, [from]: { emoji, ts } }));
      setLatestEmojiPopup({ emoji, from });
      setTimeout(() => setLatestEmojiPopup(null), 1600);
      if (emojiTimeoutsRef.current[from]) clearTimeout(emojiTimeoutsRef.current[from]);
      emojiTimeoutsRef.current[from] = setTimeout(() => {
        setReactions((prev) => {
          const next = { ...prev };
          delete next[from];
          return next;
        });
        delete emojiTimeoutsRef.current[from];
      }, 5000);
    });

    return () => {
      socket.removeAllListeners();
      Object.values(emojiTimeoutsRef.current || {}).forEach((t) => clearTimeout(t));
      emojiTimeoutsRef.current = {};
      console.log(now(), "🧹 cleaned up socket listeners & emoji timers");
    };
  }, [nickname, page, mode, stopTimer]);

  return socket;
}
