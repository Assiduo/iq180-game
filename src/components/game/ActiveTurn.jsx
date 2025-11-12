export default function ActiveTurn({
    T,
    play,
    digits,
    operators,
    disabledOps,
    expression,
    lastWasNumber,
    lastWasSqrt,
    setExpression,
    setLastWasNumber,
    setLastWasSqrt,
    checkAnswer,
}) {
    return (
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

                    // ✅ Count parentheses
                    const openCount = (expression.match(/\(/g) || []).length;
                    const closeCount = (expression.match(/\)/g) || []).length;
                    const canCloseParen = openCount > closeCount;

                    // ✅ Logical conditions for operators
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

                                if (["+", "-", "×", "÷", "(", "√"].includes(op))
                                    setLastWasNumber(false);
                                else if (op === ")") setLastWasNumber(true);
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
    );
}
