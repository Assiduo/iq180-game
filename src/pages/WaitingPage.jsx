// src/pages/WaitingPage.jsx
import React from "react";

export default function WaitingPage({ lang, waitingPlayers = [], mode, onStartGame, onLeave }) {
  return (
    <div className="waiting-page">
      <h1 className="waiting-title">
        {waitingPlayers.length > 1 ? (lang === "th" ? "พร้อมเริ่มเกม!" : "Ready to Start!") : (lang === "th" ? "⏳ รอผู้เล่น..." : "⏳ Waiting for players...")}
      </h1>

      <h2>Mode: <span className="highlight">{mode}</span></h2>

      <div className="waiting-box glass-card">
        {waitingPlayers.length > 0 ? <ul>{waitingPlayers.map((p, i) => <li key={i}>{p}</li>)}</ul> : <p>No players yet</p>}
      </div>

      {waitingPlayers.length > 1 && <button className="main-btn" onClick={onStartGame}>Start Game</button>}
      <button className="secondary-btn" onClick={onLeave}>Leave Room</button>
    </div>
  );
}
