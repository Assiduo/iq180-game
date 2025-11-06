// src/utils/gameUtils.js
/* pure helpers used by the app */

export const permute = (arr) => {
  if (!Array.isArray(arr)) return [];
  if (arr.length <= 1) return [arr];
  const result = [];
  arr.forEach((val, i) => {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    permute(rest).forEach((perm) => result.push([val, ...perm]));
  });
  return result;
};

export const findSolution = (digitsArr = [], targetVal = 0, disabled = []) => {
  const ops = ["+", "-", "*", "/"].filter(
    (op) => !disabled.includes(op === "*" ? "×" : op === "/" ? "÷" : op)
  );

  const numberPerms = permute(digitsArr);

  for (const numArr of numberPerms) {
    for (let o1 of ops)
      for (let o2 of ops)
        for (let o3 of ops)
          for (let o4 of ops) {
            const expr = `${numArr[0]}${o1}${numArr[1]}${o2}${numArr[2]}${o3}${numArr[3]}${o4}${numArr[4]}`;
            try {
              // eslint-disable-next-line no-eval
              const result = eval(expr);
              if (Number.isInteger(result) && result === targetVal) {
                return expr.replace(/\*/g, "×").replace(/\//g, "÷");
              }
            } catch {
              // ignore
            }
          }
  }
  return null;
};

export const generateProblem = (m = "easy") => {
  const digitsSample = [1, 3, 4, 6, 7];
  const operatorsSample = ["+", "-", "×", "÷", "(", ")", "√"];
  const disabledSample = [];
  const targetSample = 24;
  return {
    digits: digitsSample,
    operators: operatorsSample,
    disabledOps: disabledSample,
    target: targetSample,
    mode: m,
  };
};
