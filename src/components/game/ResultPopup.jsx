import { motion } from "framer-motion";
import { FaSignOutAlt, FaRedo } from "react-icons/fa";

export default function ResultPopup({
  T,
  resultPopup,
  solutionExpr,
  autoResumeCount,
  play,
  startGame,
  stopTimer,
  setPage,
  endByName,
}) {
  // skip rendering when popup is empty or belongs to another round
  if (!resultPopup || resultPopup === "endRound") return null;

  return (
    <motion.div
      className={`popup ${resultPopup === "invalid" ? "invalid" : ""}`}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 120 }}
    >
      {/* ✅ correct */}
      {resultPopup === "correct" && <h2>{T.correct}</h2>}

      {/* ❌ wrong */}
      {resultPopup === "wrong" && (
        <>
          <h2>{T.wrong}</h2>
          <p className="solution-text">
            💡 {T.solution}: <br />
            <span className="solution-highlight">{solutionExpr}</span>
          </p>
        </>
      )}

      {/* ⏰ timeout */}
      {resultPopup === "timeout" && (
        <>
          <h2>{T.timeout}</h2>
          <p className="solution-text">
            💡 {T.correctAnswer || "Possible Solution"}: <br />
            <span className="solution-highlight">{solutionExpr}</span>
          </p>
        </>
      )}

      {/* 🚫 invalid */}
      {resultPopup === "invalid" && <h2>{T.invalidExpr}</h2>}

      {/* 💀 game over */}
      {resultPopup === "gameover" && (
        <>
          <h2>💀 Game Over</h2>
          {endByName && (
            <p className="solution-text">
              🛑 {T.endedBy}:{" "}
              <span className="solution-highlight">{endByName}</span>
            </p>
          )}
          <p className="solution-text">{T.notEnoughPlayers}</p>
        </>
      )}

      {/* ⏳ auto resume countdown */}
      {autoResumeCount !== null ? (
        <p className="resume-count">
          Resuming next turn in{" "}
          <span className="highlight">{autoResumeCount}</span>s...
        </p>
      ) : (
        /* 🎮 action buttons */
        <div className="popup-btns">
          <button
            onClick={() => {
              play("click");
              startGame();
            }}
          >
            <FaRedo /> {T.playAgain}
          </button>
          <button
            onClick={() => {
              play("click");
              stopTimer();
              setPage("stats");
            }}
          >
            <FaSignOutAlt /> {T.exit}
          </button>
        </div>
      )}
    </motion.div>
  );
}
