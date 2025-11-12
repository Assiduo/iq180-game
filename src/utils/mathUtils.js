// src/utils/mathUtils.js
// Safe-ish evaluator and numeric helpers used by solver/generator.

const makeSafeFunction = (expr) => {
  // Replace sqrt symbol if used
  const cleaned = expr
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/√\(/g, "Math.sqrt(")
    .replace(/\^/g, "**");

  // Disallow letters except Math, numbers, operators and parentheses
  // This is a light safety layer (do not expose to untrusted user input).
  if (/[^0-9+\-*/().\sMathsqrt]/.test(cleaned)) {
    throw new Error("Expression contains invalid characters");
  }

  // new Function is used here for speed; keep restricted to internal solver only.
  // eslint-disable-next-line no-new-func
  return new Function(`return (${cleaned});`);
};

export function safeEval(expr) {
  try {
    const fn = makeSafeFunction(expr);
    const res = fn();
    // coerce Infinity/NaN as invalid
    if (!Number.isFinite(res)) return NaN;
    return res;
  } catch (err) {
    return NaN;
  }
}

/**
 * isClose
 * - numeric comparison allowing floating point fuzz
 */
export function isClose(a, b, eps = 1e-9) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= eps;
}
