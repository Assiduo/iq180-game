// src/components/OpsGrid.jsx
import React from "react";

export default function OpsGrid({ operators = [], expression = "", disabledOps = [], onOp }) {
  return (
    <div className="ops-grid">
      {operators.map((op) => {
        const lastChar = expression.slice(-1);
        const openCount = (expression.match(/\(/g) || []).length;
        const closeCount = (expression.match(/\)/g) || []).length;
        const canCloseParen = openCount > closeCount;
        const canPressRoot = lastChar === "" || ["+", "-", "×", "÷", "("].includes(lastChar);
        const canPressOpenParen = lastChar === "" || ["+", "-", "×", "÷", "("].includes(lastChar);
        const canPressCloseParen = lastChar !== "" && /[\d)]$/.test(lastChar) && canCloseParen;
        const canPressOperator = lastChar !== "" && !["+", "-", "×", "÷", "("].includes(lastChar);

        let logicDisabled = false;
        if (op === "√" && !canPressRoot) logicDisabled = true;
        if (op === "(" && !canPressOpenParen) logicDisabled = true;
        if (op === ")" && !canPressCloseParen) logicDisabled = true;
        if (["+", "-", "×", "÷"].includes(op) && !canPressOperator) logicDisabled = true;

        const lockedDisabled = disabledOps.includes(op);
        const isDisabled = logicDisabled || lockedDisabled;
        const className = lockedDisabled ? "op-btn disabled" : "op-btn";

        return (
          <button key={op} disabled={isDisabled} className={className} onClick={() => !isDisabled && onOp(op)}>
            {op}
          </button>
        );
      })}
    </div>
  );
}
