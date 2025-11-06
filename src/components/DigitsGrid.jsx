// src/components/DigitsGrid.jsx
import React from "react";

export default function DigitsGrid({ digits = [], expression = "", lastWasNumber, onDigit }) {
  return (
    <div className="digits-grid">
      {digits.map((n) => {
        const used = expression.includes(String(n));
        return (
          <button key={n} disabled={lastWasNumber || used} className={`digit-btn ${used ? "used" : ""}`} onClick={() => onDigit(n)}>
            {n}
          </button>
        );
      })}
    </div>
  );
}
