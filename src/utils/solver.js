const toJsOp = (uiOp) => {
  if (uiOp === "×") return "*";
  if (uiOp === "÷") return "/";
  return uiOp;
};

export function findSolution(digits = [], target, disabledOps = []) {
  if (!Array.isArray(digits) || digits.length === 0) return null;
  // Allowed JS operators (internal form)
  const baseOps = ["+", "-", "*", "/"];
  // Map disabled UI tokens (×, ÷) to their JS form
  const disabledJs = (disabledOps || []).map((o) => toJsOp(o));

  const ops = baseOps.filter((op) => !disabledJs.includes(op));
  if (ops.length === 0) return null;

  // Generate permutations of digits (simple recursive permute)
  const permute = (arr) => {
    if (arr.length <= 1) return [arr];
    const res = [];
    for (let i = 0; i < arr.length; i++) {
      const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
      for (const p of permute(rest)) res.push([arr[i], ...p]);
    }
    return res;
  };

  const numberPerms = permute(digits);

  // Try all operator combinations (ops^4). digits length is expected to be 5.
  for (const numArr of numberPerms) {
    // small micro-optimisation: create string parts once
    const a = String(numArr[0]),
      b = String(numArr[1]),
      c = String(numArr[2]),
      d = String(numArr[3]),
      e = String(numArr[4]);

    for (let o1 of ops)
      for (let o2 of ops)
        for (let o3 of ops)
          for (let o4 of ops) {
            const jsExpr = `${a}${o1}${b}${o2}${c}${o3}${d}${o4}${e}`;
            try {
              // eslint-disable-next-line no-eval
              const res = eval(jsExpr);
              // exact integer match
              if (Number.isFinite(res) && Math.round(res) === res && res === target) {
                // return expression in UI operator tokens
                return jsExpr.replace(/\*/g, "×").replace(/\//g, "÷");
              }
            } catch (err) {
              // ignore malformed (shouldn't happen with controlled inputs)
            }
          }
  }

  return null;
}

export default { findSolution };
