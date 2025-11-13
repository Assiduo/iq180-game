import { findSolution } from "./solver.js";

/**
 *
 * @param {Object} params
 * @param {string} params.expression - user input expression string
 * @param {number[]} params.digits - digits for the current round
 * @param {number} params.target - target result
 * @param {string[]} params.disabledOps - list of disabled operators (e.g. ["×", "÷"])
 * @returns {{
 *   valid: boolean,
 *   correct: boolean,
 *   result: number | null,
 *   solutionExpr: string | null,
 *   reason?: string
 * }}
 */
export function checkAnswerCore({ expression, digits, target, disabledOps = [] }) {
    const expr = (expression || "").trim();
    if (!expr) return { valid: false, correct: false, result: null, reason: "empty" };

    // Basic validity checks
    if (!/\d/.test(expr))
        return { valid: false, correct: false, result: null, reason: "no_digit" };
    if (/^[+\-×÷*/)]/.test(expr))
        return { valid: false, correct: false, result: null, reason: "bad_start" };
    if (/[+\-×÷*/(]$/.test(expr))
        return { valid: false, correct: false, result: null, reason: "bad_end" };

    // Evaluate safely
    try {
        const clean = expr
            .replace(/×/g, "*")
            .replace(/÷/g, "/")
            .replace(/\^/g, "**")
            .replace(/√(\d+|\([^()]+\))/g, "Math.sqrt($1)");

        // eslint-disable-next-line no-eval
        const result = eval(clean);

        const correct = Number.isFinite(result) && Math.abs(result - target) < 1e-9;

        if (correct) {
            return { valid: true, correct: true, result, solutionExpr: null };
        } else {
            const sol = findSolution(digits, target, disabledOps);
            return {
                valid: true,
                correct: false,
                result,
                solutionExpr: sol || "No valid solution found",
            };
        }
    } catch (err) {
        return { valid: false, correct: false, result: null, reason: "eval_error" };
    }
}

export async function handleCheckAnswer({
    expression,
    digits,
    target,
    disabledOps,
    play,
    setResultPopup,
    setScore,
    setSolutionExpr,
    setHistory,
    rounds,
    nickname,
    mode,
    score,
    socket,
    setAutoResumeCount,
    isMyTurn,
    setIsMyTurn,
}) {
    const outcome = checkAnswerCore({ expression, digits, target, disabledOps });

    if (!outcome.valid) {
        play("wrong");
        setResultPopup("invalid");
        return outcome;
    }

    if (outcome.correct) {
        play("correct");
        setScore((s) => s + 1);
        setResultPopup("correct");
        setSolutionExpr("");
    } else {
        play("wrong");
        setResultPopup("wrong");
        setSolutionExpr(outcome.solutionExpr);
    }

    setHistory((h) => [
        ...h,
        { round: rounds + 1, result: outcome.result, ok: outcome.correct },
    ]);

    // Emit result to server
    if (socket && socket.connected) {
        socket.emit("answerResult", {
            nickname,
            mode,
            result: outcome.result,
            correct: outcome.correct,
            solutionExpr: outcome.solutionExpr,
            score: outcome.correct ? score + 1 : score,
            round: rounds + 1,
        });
    }

    // Auto resume timer (3s)
    let count = 3;
    setAutoResumeCount(count);
    const timer = setInterval(() => {
        count -= 1;
        setAutoResumeCount(count);
        if (count <= 0) {
            clearInterval(timer);
            setAutoResumeCount(null);
            setResultPopup(null);
            if (isMyTurn) {
                socket.emit("resumeGame", { mode });
                setIsMyTurn(false);
            }
        }
    }, 1000);

    return outcome;
}

export default { checkAnswerCore, handleCheckAnswer };
