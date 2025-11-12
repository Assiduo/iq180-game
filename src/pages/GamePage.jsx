// src/pages/GamePage.jsx
import { motion } from "framer-motion";
import { FaSignOutAlt, FaRedo } from "react-icons/fa";

export default function GamePage({
  T,
  lang,
  nickname,
  reactions,
  dropdownOpen,
  setDropdownOpen,
  isHost,
  isMyTurn,
  endGameForAll,
  leaveGame,
  sendEmoji,
  gameState,
  rounds,
  timeLeft,
  score,
  digits,
  operators,
  disabledOps,
  expression,
  lastWasNumber,
  lastWasSqrt,
  solutionExpr,
  resultPopup,
  endByName,
  autoResumeCount,
  play,
  setExpression,
  setLastWasNumber,
  setLastWasSqrt,
  stopTimer,
  startGame,
  setPage,
  checkAnswer,
  fade,
}) {
  return (
    <motion.div key="game" className="game-page" {...fade}>
      {/* 🧑 Player Header */}
      <div className="game-header">
        <h2 className="big-player">
          {T.playerName}: <span>{nickname}</span>
          {reactions[nickname] && (
            <span style={{ marginLeft: 10, fontSize: 22, opacity: 0.95 }}>
              {reactions[nickname].emoji}
            </span>
          )}
        </h2>

        {/* 🔘 Bottom Controls */}
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: 16,
            transform: "translateX(-50%)",
            display: "flex",
            gap: 12,
            justifyContent: "center",
            alignItems: "center",
            flexWrap: "wrap",
            zIndex: 20,
            padding: "8px 12px",
            borderRadius: 12,
            backdropFilter: "blur(6px)",
          }}
        >
          {/* Leave Game */}
          <button className="glass-btn" onClick={leaveGame}>
            <FaSignOutAlt /> {T.exitGame}
          </button>

          {/* Emoji button */}
          <div style={{ position: "relative" }}>
            <button
              className="glass-btn"
              onClick={() =>
                setDropdownOpen(dropdownOpen === "emoji" ? null : "emoji")
              }
              title="Send emoji"
            >
              😊
            </button>

            {dropdownOpen === "emoji" && (
              <div
                className="dropdown-menu"
                style={{
                  right: 0,
                  left: "auto",
                  padding: 8,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  width: 220,
                  zIndex: 30,
                }}
              >
                {["😊", "🔥", "👏", "😮", "😂", "👍", "❤️", "🎉"].map((e) => (
                  <button
                    key={e}
                    style={{
                      fontSize: 20,
                      padding: 8,
                      borderRadius: 8,
                      minWidth: 40,
                      border: "none",
                      background: "rgba(255,255,255,0.03)",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      sendEmoji(e);
                      setDropdownOpen(null);
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Host End Game Button */}
          {isHost && (
            <button
              className="glass-btn"
              style={{ borderColor: "rgba(255,100,100,0.6)" }}
              onClick={endGameForAll}
            >
              🛑 {T.endGame}
            </button>
          )}
        </div>

        {/* 🎯 Game Status */}
        {isMyTurn ? (
          <>
            <h3 className="turn-status">🎯 It's your turn!</h3>
            <div className="game-stats">
              <p className="round-display">
                Round: <span className="highlight">{rounds}</span>
              </p>
              <h1 className="target-title">
                {T.target}: <span className="highlight">{gameState?.target}</span>
              </h1>
              <p className={timeLeft <= 10 ? "time-score time-low" : "time-score"}>
                {T.timeLeft}: {timeLeft}s
              </p>
              <p>
                {T.score}: {score}
              </p>
            </div>
          </>
        ) : (
          <div className="waiting-header">
            <h3 className="turn-status">
              ⏳ Waiting for{" "}
              <span className="highlight">{gameState?.currentTurn}</span>...
            </h3>
            <h1 className={`waiting-time ${timeLeft <= 10 ? "time-critical" : ""}`}>
              {timeLeft > 0 ? `${timeLeft}s` : "00s"}
            </h1>
            {gameState?.currentTurn && reactions[gameState.currentTurn] && (
              <div style={{ marginTop: 6 }}>
                <strong>{reactions[gameState.currentTurn].emoji}</strong>
              </div>
            )}
          </div>
        )}
      </div>

      {/* GAME BODY */}
      {!isMyTurn ? (
        <div className="waiting-turn glass-card">
          <h2 className="waiting-title">
            ⏳ Waiting for{" "}
            <span className="highlight">{gameState?.currentTurn}</span>...
          </h2>
          <div className="waiting-timer">
            <h1 className={`time-left ${timeLeft <= 10 ? "time-critical" : ""}`}>
              {timeLeft > 0 ? `${timeLeft}s` : "00s"}
            </h1>
          </div>
          <p className="hint-text">Please wait until it's your turn to play.</p>
        </div>
      ) : (
        <>
          {/* DIGITS */}
          <div className="digits-grid">
            {digits.map((n) => {
              const used = expression.includes(String(n));
              return (
                <button
                  key={n}
                  disabled={lastWasNumber || used}
                  className={`digit-btn ${used ? "used" : ""}`}
                  onClick={() => {
                    play("click");
                    if (!used && !lastWasNumber) {
                      setExpression((p) => p + n);
                      setLastWasNumber(true);
                    }
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>

          {/* OPERATORS */}
          <div className="ops-grid">
            {operators.map((op) => {
              const lastChar = expression.slice(-1);
              const openCount = (expression.match(/\(/g) || []).length;
              const closeCount = (expression.match(/\)/g) || []).length;
              const canCloseParen = openCount > closeCount;
              const canPressRoot =
                lastChar === "" || ["+", "-", "×", "÷", "("].includes(lastChar);
              const canPressOpenParen =
                lastChar === "" || ["+", "-", "×", "÷", "("].includes(lastChar);
              const canPressCloseParen =
                lastChar !== "" && /[\d)]$/.test(lastChar) && canCloseParen;
              const canPressOperator =
                lastChar !== "" && !["+", "-", "×", "÷", "("].includes(lastChar);

              let logicDisabled = false;
              if (op === "√" && !canPressRoot) logicDisabled = true;
              if (op === "(" && !canPressOpenParen) logicDisabled = true;
              if (op === ")" && !canPressCloseParen) logicDisabled = true;
              if (["+", "-", "×", "÷"].includes(op) && !canPressOperator)
                logicDisabled = true;

              const lockedDisabled = disabledOps.includes(op);
              const isDisabled = logicDisabled || lockedDisabled;
              const className = lockedDisabled ? "op-btn disabled" : "op-btn";

              return (
                <button
                  key={op}
                  disabled={isDisabled}
                  className={className}
                  onClick={() => {
                    if (isDisabled) return;
                    play("click");
                    setExpression((prev) => prev + op);
                    if (["+", "-", "×", "÷", "(", "√"].includes(op)) {
                      setLastWasNumber(false);
                    } else if (op === ")") {
                      setLastWasNumber(true);
                    }
                  }}
                >
                  {op}
                </button>
              );
            })}
          </div>

          {/* EXPRESSION */}
          <input
            className="expression-box"
            readOnly
            value={expression}
            placeholder={T.buildEq}
          />

          {/* ACTION BUTTONS */}
          <div className="action-row">
            <button
              className="equal-btn glass-btn"
              onClick={() => {
                play("click");
                setExpression((p) => p.slice(0, -1));
                setLastWasNumber(false);
                setLastWasSqrt(false);
              }}
            >
              {T.delete}
            </button>
            <button
              className="equal-btn glass-btn"
              onClick={() => {
                play("click");
                checkAnswer();
              }}
              disabled={digits.some((d) => !expression.includes(String(d)))}
            >
              {T.submit}
            </button>
          </div>
        </>
      )}

      {/* 🧩 POPUP */}
      {resultPopup && resultPopup !== "endRound" && (
        <motion.div
          className={`popup ${resultPopup === "invalid" ? "invalid" : ""}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 120 }}
        >
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
                💡 {T.correctAnswer || "Possible Solution"}: <br />
                <span className="solution-highlight">{solutionExpr}</span>
              </p>
            </>
          )}

          {resultPopup === "invalid" && <h2>{T.invalidExpr}</h2>}

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

          {autoResumeCount !== null && (
            <p className="resume-count">
              Resuming next turn in{" "}
              <span className="highlight">{autoResumeCount}</span>s...
            </p>
          )}

          {autoResumeCount === null && (
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
      )}
    </motion.div>
  );
}
