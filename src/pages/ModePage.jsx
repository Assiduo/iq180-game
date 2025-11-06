// src/pages/ModePage.jsx
import React from "react";

export default function ModePage({ T, nickname, playerList = [], onChooseMode }) {
  return (
    <div className="mode-page">
      <h2 className="big-player">{T.playerName}: <span>{nickname}</span></h2>

      <div className="online-box glass-card">
        <h3 className="online-title">👥 Players Online</h3>
        {playerList && playerList.length > 0 ? (
          <ul className="online-list">{playerList.map((p, i) => <li key={i}>{p}</li>)}</ul>
        ) : (
          <p className="online-empty">No players online</p>
        )}
      </div>

      <h1 className="select-mode-title">{T.selectMode}</h1>

      <div className="mode-buttons">
        <button className="mode-btn glass-btn" onClick={() => onChooseMode("easy")}>{T.easy}</button>
        <button className="mode-btn glass-btn" onClick={() => onChooseMode("hard")}>{T.hard}</button>
      </div>
    </div>
  );
}
