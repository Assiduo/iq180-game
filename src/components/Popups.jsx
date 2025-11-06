// src/components/Popups.jsx
import React from "react";
import { motion } from "framer-motion";
import { FaRedo, FaSignOutAlt } from "react-icons/fa";

export default function Popups({ resultPopup, T, solutionExpr, autoResumeCount, onPlayAgain, onExit }) {
  if (!resultPopup) return null;
  return (
    <motion.div className={`popup ${resultPopup === "invalid" ? "invalid" : ""}`} initial={{ scale: 0 }} animate={{ scale: 1 }}>
      {resultPopup === "correct" && <h2>{T.correct}</h2>}

      {resultPopup === "wrong" && (
        <>
          <h2>{T.wrong}</h2>
          <p className="solution-text">
            💡 {T.solution}: <br />
            <span className="solution-highlight">{solutionExpr}</span>
          </p>
        </>
      )}

      {resultPopup === "timeout" && (
        <>
          <h2>{T.timeout}</h2>
          <p className="solution-text">
            💡 {T.solution}: <br />
            <span className="solution-highlight">{solutionExpr}</span>
          </p>
        </>
      )}

      {resultPopup === "invalid" && <h2>{T.invalidExpr}</h2>}

      {resultPopup === "gameover" && (
        <>
          <h2>💀 Game Over</h2>
          <p className="solution-text">Not enough players to continue.</p>
        </>
      )}

      {autoResumeCount !== null && (
        <p className="resume-count">
          Resuming next turn in <span className="highlight">{autoResumeCount}</span>s...
        </p>
      )}

      {autoResumeCount === null && (
        <div className="popup-btns">
          <button onClick={onPlayAgain}><FaRedo /> {T.playAgain}</button>
          <button onClick={onExit}><FaSignOutAlt /> {T.exit}</button>
        </div>
      )}
    </motion.div>
  );
}
