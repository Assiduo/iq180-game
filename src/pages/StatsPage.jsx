// src/pages/StatsPage.jsx
import React from "react";

export default function StatsPage({ T, scores = {}, waitingPlayers = [], gameState = {}, nickname, onBack }) {
  const entries = Object.entries(scores ?? {});
  const turnOrder = Array.isArray(gameState?.turnOrder) ? gameState.turnOrder : [];
  const waiters = Array.isArray(waitingPlayers) ? waitingPlayers : [];
  const basePlayers = [...new Set([...turnOrder, ...waiters, nickname].filter(Boolean))];
  const rowsRaw = entries.length > 0 ? entries : basePlayers.map((name) => [name, 0]);
  if (rowsRaw.length === 0) {
    return <p>No players yet</p>;
  }
  const sorted = [...rowsRaw].sort((a, b) => b[1] - a[1]);
  const [winName, winScore] = sorted[0];

  return (
    <div className="stats-page">
      <h2 className="stats-title">{T.stats}</h2>
      <div className="winner-banner">
        <h3>🏆 Winner: <span className="highlight">{winName}</span></h3>
        <p>Score: <strong>{winScore}</strong></p>
      </div>
      <div className="scoreboard glass-card">
        <table style={{ width: "100%" }}>
          <thead><tr><th>Player</th><th style={{ textAlign: "right" }}>Score</th></tr></thead>
          <tbody>
            {sorted.map(([name, sc]) => (
              <tr key={name}>
                <td>{name === nickname ? <span className="you-label">You</span> : null}{name}</td>
                <td style={{ textAlign: "right" }}><strong>{sc}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="stats-actions">
        <button className="main-btn" onClick={onBack}>Back</button>
      </div>
    </div>
  );
}
