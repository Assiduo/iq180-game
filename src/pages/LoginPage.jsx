// src/pages/LoginPage.jsx
import React from "react";
import { FaArrowRight } from "react-icons/fa";

export default function LoginPage({ T, nickname, setNickname, onStart }) {
  return (
    <motionlessDiv>
      <div className="glass-card login-page">
        <h1 className="title">{T.title}</h1>
        <p className="subtitle">{T.subtitle}</p>
        <input type="text" placeholder={T.enterName} value={nickname} onChange={(e) => setNickname(e.target.value)} />
        <button className="main-btn" onClick={onStart}>
          {T.start} <FaArrowRight />
        </button>
      </div>
    </motionlessDiv>
  );
}
