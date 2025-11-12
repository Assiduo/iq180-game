function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Build a random expression from `numbers` and `ops` ensuring a positive integer result.
 * @param {number[]} numbers - array of numbers (e.g. [1,2,3,4,5])
 * @param {string[]} ops - allowed operator tokens (e.g. ["+", "-", "×", "÷", "√", "(", ")"])
 * @param {"easy"|"hard"} mode
 * @param {string[]} disabledOps - operators to exclude
 * @param {number} maxAttempts - (optional) how many tries before giving up
 * @returns {{ expr: string, result: number }}
 */
export function createExpressionWithResult(
    numbers,
    ops,
    mode,
    disabledOps = [],
    maxAttempts = 300
) {
    const nums = shuffleInPlace([...numbers]);
    const allowedOps = ops.filter((o) => !disabledOps.includes(o));
    let expr = "";
    let attempts = 0;
    let result = 0;

    while ((!Number.isInteger(result) || result <= 0) && attempts < maxAttempts) {
        attempts++;
        expr = "";

        for (let i = 0; i < nums.length; i++) {
            let n = nums[i];

            // occasionally wrap a number with sqrt in hard mode if allowed
            if (mode === "hard" && allowedOps.includes("√") && Math.random() < 0.3) {
                n = `√${n}`;
            }

            expr += n;
            if (i < nums.length - 1) {
                const op = allowedOps[Math.floor(Math.random() * allowedOps.length)];
                expr += op;
            }
        }

        try {
            // convert tokens to JS-evaluable expression
            const clean = expr
                .replace(/×/g, "*")
                .replace(/÷/g, "/")
                .replace(/√(\d+|\([^()]+\))/g, "Math.sqrt($1)");
            // eslint-disable-next-line no-eval
            result = eval(clean);
        } catch (e) {
            result = 0;
        }
    }

    return { expr, result };
}

/**
 * Generate a problem object (digits, operators, disabledOps, target, expr, mode)
 * @param {"easy"|"hard"} mode
 * @returns {{ digits: number[], operators: string[], disabledOps: string[], target: number, expr: string, mode: string }}
 */
export function generateProblem(mode = "easy") {
    const nums = Array.from({ length: 9 }, (_, i) => i + 1);
    const selected = [];
    while (selected.length < 5) {
        const idx = Math.floor(Math.random() * nums.length);
        selected.push(nums.splice(idx, 1)[0]);
    }

    const baseOps = ["+", "-", "×", "÷"];
    const dis = [];

    if (mode === "hard") {
        // pick up to 2 disabled base ops (unique)
        while (dis.length < 2) {
            const op = baseOps[Math.floor(Math.random() * baseOps.length)];
            if (!dis.includes(op)) dis.push(op);
        }
    }

    const allOps = mode === "hard" ? baseOps.concat(["√", "(", ")"]) : baseOps;

    const { expr, result } = createExpressionWithResult(selected, allOps, mode, dis);

    return {
        digits: selected,
        operators: allOps,
        disabledOps: dis,
        target: result,
        expr,
        mode,
    };
}

// default export for convenience
export default { createExpressionWithResult, generateProblem };
