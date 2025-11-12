// src/hooks/useGameTimer.js
import { useEffect, useRef, useState } from "react";
import { findSolution } from "../utils/solver";

/**
 * Custom game timer for IQ180
 * Handles ticking, timeout events, and auto-resume countdown
 */
export default function useGameTimer({
  running,
  baseTime,
  duration = 60,
  play,
  problemRef,
  nickname,
  score,
  rounds,
  mode,
  isMyTurn,
  socket,
  setRunning,
  setResultPopup,
  setSolutionExpr,
  setAutoResumeCount,
  setIsMyTurn,
}) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!running || baseTime === null) return;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - baseTime) / 1000);
      const remaining = Math.max(duration - elapsed, 0);

      // update time remaining via state outside hook
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        setRunning(false);
        play("timeout");

        // ✅ Use latest problem snapshot
        const { digits, target, disabledOps } = problemRef.current;
        const sol = findSolution(digits, target, disabledOps);
        setSolutionExpr(sol || "No valid solution found");
        setResultPopup("timeout");

        // Notify server
        if (socket && socket.connected) {
          socket.emit("answerResult", {
            nickname,
            result: "timeout",
            correct: false,
            score,
            round: rounds + 1,
            mode,
          });
        }

        // Auto resume countdown
        let count = 3;
        setAutoResumeCount(count);
        const countdown = setInterval(() => {
          count -= 1;
          setAutoResumeCount(count);
          if (count <= 0) {
            clearInterval(countdown);
            setAutoResumeCount(null);
            setResultPopup(null);
            if (isMyTurn && socket && socket.connected) {
              socket.emit("resumeGame", { mode });
              setIsMyTurn(false);
            }
          }
        }, 1000);
      }
    };

    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [running, baseTime]);

  return timerRef;
}
