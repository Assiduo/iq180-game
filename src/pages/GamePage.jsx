// src/pages/GamePage.jsx
import React from "react";
import DigitsGrid from "../components/DigitsGrid";
import OpsGrid from "../components/OpsGrid";
import Popups from "../components/Popups";

/**
 * GamePage receives many state props from App and renders UI.
 * Keep this file presentational — handlers live in App.
 */
export default function GamePage(props) {
  const {
    T, nickname, isMyTurn, gameState, timeLeft, target, score,
    digits, operators, expression, lastWasNumber, disabledOps,
    onDigit, onOp, onDelete, onSubmit, resultPopup, solutionExpr, autoResumeCount,
    onPlayAgain, onExit
  } = props;

  return (
    <div className="game-page">
      <div className="game-header">
        <h2 className="big-player">{T.playerName}: <span>{nickname}</span></h2>

        <div style={{ position: "fixed", left: "50%", bottom: 16, transform: "translateX(-50%)" }}>
          <button className="glass-btn" onClick={onExit}>{T.exit}</button>
        </div>

        {isMyTurn ? (
          <>
            <h3 className="turn-status">🎯 It's your turn!</h3>
            <div className="game-stats">
              <p>Round: <span className="highlight">{props.rounds}</span></p>
              <h1>{T.target}: <span className="highlight">{target}</span></h1>
              <p>{T.timeLeft}: {timeLeft}s</p>
              <p>{T.score}: {score}</p>
            </div>
          </>
        ) : (
          <div className="waiting-header">
            <h3 className="turn-status">⏳ Waiting for <span className="highlight">{gameState?.currentTurn}</span>...</h3>
            <h1 className={`waiting-time ${timeLeft <= 10 ? "time-critical" : ""}`}>{timeLeft > 0 ? `${timeLeft}s` : "00s"}</h1>
          </div>
        )}
      </div>

      {isMyTurn ? (
        <>
          <DigitsGrid digits={digits} expression={expression} lastWasNumber={lastWasNumber} onDigit={(d) => onDigit(String(d))} />
          <OpsGrid operators={operators} expression={expression} disabledOps={disabledOps} onOp={onOp} />
          <input className="expression-box" readOnly value={expression} placeholder={T.buildEq} />
          <div className="action-row">
            <button className="equal-btn glass-btn" onClick={onDelete}>{T.delete}</button>
            <button className="equal-btn glass-btn" onClick={onSubmit} disabled={digits.some((d) => !expression.includes(String(d)))}>{T.submit}</button>
          </div>
        </>
      ) : (
        <div className="waiting-turn glass-card">
          <h2 className="waiting-title">⏳ Waiting for <span className="highlight">{gameState?.currentTurn}</span>...</h2>
        </div>
      )}

      <Popups resultPopup={resultPopup} T={T} solutionExpr={solutionExpr} autoResumeCount={autoResumeCount} onPlayAgain={onPlayAgain} onExit={onExit} />
    </div>
  );
}
