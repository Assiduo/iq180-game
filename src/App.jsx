import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Howl } from "howler";
import {
  FaArrowLeft,
  FaArrowRight,
  FaVolumeUp,
  FaGlobe,
  FaRedo,
  FaSignOutAlt,
  FaPalette,
} from "react-icons/fa";
import "./App.css";

import clickSoundFile from "./sounds/click.mp3";
import correctSoundFile from "./sounds/correct.mp3";
import wrongSoundFile from "./sounds/wrong.mp3";
import timeoutSoundFile from "./sounds/timeout.mp3";
import bgmFile from "./sounds/bgm.mp3";

export default function App() {
  /* 🌍 MULTI-LANGUAGE */
  const [lang, setLang] = useState("en");
  const texts = {
    en: {
      title: "IQ180",
      subtitle: "Challenge your logic to the limit.",
      enterName: "Enter nickname...",
      start: "Start",
      selectMode: "Select Game Mode",
      easy: "Normal Mode",
      hard: "Genius Mode",
      target: "Target",
      timeLeft: "Time Left",
      score: "Score",
      delete: "Delete",
      submit: "Submit",
      correct: "✅ Correct!",
      wrong: "❌ Wrong!",
      timeout: "⏰ Time’s Up!",
      playAgain: "Play Again",
      exit: "Exit",
      back: "Back",
      stats: "Stats Summary",
      history: "History",
      rounds: "Rounds Played",
      notEnough: "Use all digits before submitting!",
      invalidExpr:
        "Invalid Expression. Each number must be followed by an operator.",
      buildEq: "Build your equation...",
      playerName: "Player Name",
      solution: "Possible Solution",
    },
    th: {
      title: "IQ180",
      subtitle: "ท้าทายตรรกะของคุณให้ถึงขีดสุด!",
      enterName: "กรอกชื่อผู้เล่น...",
      start: "เริ่ม",
      selectMode: "เลือกโหมดเกม",
      easy: "โหมดปกติ",
      hard: "โหมดอัจฉริยะ",
      target: "เป้าหมาย",
      timeLeft: "เวลาที่เหลือ",
      score: "คะแนน",
      delete: "ลบ",
      submit: "ตรวจคำตอบ",
      correct: "✅ ถูกต้อง!",
      wrong: "❌ ผิด!",
      timeout: "⏰ หมดเวลา!",
      playAgain: "เล่นต่อ",
      exit: "ออกจากเกม",
      back: "ย้อนกลับ",
      stats: "สรุปผลการเล่น",
      history: "ประวัติการเล่น",
      rounds: "จำนวนรอบทั้งหมด",
      notEnough: "ต้องใช้เลขทั้งหมดก่อนกดส่งคำตอบ!",
      invalidExpr:
        "รูปแบบสมการไม่ถูกต้อง ต้องมีเครื่องหมายคั่นระหว่างเลข",
      buildEq: "สร้างสมการของคุณ...",
      playerName: "ชื่อผู้เล่น",
      solution: "วิธีเฉลยที่เป็นไปได้",
    },
    zh: {
      title: "IQ180",
      subtitle: "挑战你的逻辑极限！",
      enterName: "输入昵称...",
      start: "开始",
      selectMode: "选择模式",
      easy: "普通模式",
      hard: "天才模式",
      target: "目标",
      timeLeft: "剩余时间",
      score: "分数",
      delete: "删除",
      submit: "提交",
      correct: "✅ 正确!",
      wrong: "❌ 错误!",
      timeout: "⏰ 时间到!",
      playAgain: "再玩一次",
      exit: "退出游戏",
      back: "返回",
      stats: "统计结果",
      history: "历史记录",
      rounds: "游戏轮次",
      notEnough: "请使用所有数字再提交！",
      invalidExpr: "表达式无效，数字之间必须有运算符。",
      buildEq: "建立你的方程式...",
      playerName: "玩家名称",
      solution: "可能的解法",
    },
  };
  const T = texts[lang];

  /* 🎨 THEMES */
  const themes = {
    galaxyBlue: {
      name: "Galaxy Neon Blue",
      background: "radial-gradient(circle at 20% 30%, #001133, #000000 70%)",
      accent: "#00bfff",
      text: "#eaf6ff",
    },
    galaxyPink: {
      name: "Cyber Neon Pink",
      background: "radial-gradient(circle at 80% 20%, #2a001f, #000000 80%)",
      accent: "#ff00a6",
      text: "#ffe6ff",
    },
    auroraEmerald: {
      name: "Aurora Emerald",
      background: "linear-gradient(135deg, #003333, #006644, #001122)",
      accent: "#00ffcc",
      text: "#eafff4",
    },
    crimsonInferno: {
      name: "Crimson Inferno",
      background: "linear-gradient(135deg, #2b0000, #660000, #330000)",
      accent: "#ff4444",
      text: "#ffe5e5",
    },
  };
  const [theme, setTheme] = useState("galaxyBlue");
  const [dropdownOpen, setDropdownOpen] = useState(null);

  /* 🔊 SOUND ENGINE */
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const clickSound = new Howl({ src: [clickSoundFile], volume: 0.6 });
  const correctSound = new Howl({ src: [correctSoundFile], volume: 0.7 });
  const wrongSound = new Howl({ src: [wrongSoundFile], volume: 0.7 });
  const timeoutSound = new Howl({ src: [timeoutSoundFile], volume: 0.6 });
  const [bgm] = useState(() => new Howl({ src: [bgmFile], loop: true }));

  useEffect(() => {
    bgm.volume(volume);
    if (volume === 0) setMuted(true);
    if (!muted && !bgm.playing()) bgm.play();
    if (muted) bgm.pause();
  }, [muted, volume, bgm]);

  const toggleMute = () => {
    if (muted) {
      setMuted(false);
      setVolume(0.4);
      bgm.play();
    } else {
      setMuted(true);
      setVolume(0);
      bgm.pause();
    }
  };

  const playSound = (type) => {
    if (muted) return;
    const sounds = {
      click: clickSound,
      correct: correctSound,
      wrong: wrongSound,
      timeout: timeoutSound,
    };
    sounds[type]?.play();
  };

  /* ⚙️ GAME STATE */
  const [page, setPage] = useState("login");
  const [nickname, setNickname] = useState("");
  const [mode, setMode] = useState("easy");
  const [score, setScore] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [digits, setDigits] = useState([]);
  const [operators, setOperators] = useState([]);
  const [disabledOps, setDisabledOps] = useState([]);
  const [target, setTarget] = useState(0);
  const [expression, setExpression] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);
  const [running, setRunning] = useState(false);
  const [resultPopup, setResultPopup] = useState(null);
  const [solution, setSolution] = useState(null);
  const [history, setHistory] = useState([]);
  const [lastWasNumber, setLastWasNumber] = useState(false);
  const [lastWasSqrt, setLastWasSqrt] = useState(false);
  const timerRef = useRef(null);
  const [solutionExpr, setSolutionExpr] = useState(""); // ✅ เก็บสมการเฉลยจริง


/* 🎲 GAME GENERATOR (FINAL FIXED VERSION) */
const generateProblem = (mode) => {
  const nums = Array.from({ length: 9 }, (_, i) => i + 1);
  const selected = [];
  while (selected.length < 5) {
    const idx = Math.floor(Math.random() * nums.length);
    selected.push(nums.splice(idx, 1)[0]);
  }

  const baseOps = ["+", "-", "×", "÷"];
  const dis = [];

  // ❌ สุ่มเครื่องหมายต้องห้าม 2 ตัว (เฉพาะจาก 4 ตัวหลัก)
  if (mode === "hard") {
    while (dis.length < 2) {
      const op = baseOps[Math.floor(Math.random() * baseOps.length)];
      if (!dis.includes(op)) dis.push(op);
    }
  }

  // ✅ แสดงทุกปุ่ม แต่บางอันห้ามใช้ (เทา)
  const allOps =
    mode === "hard"
      ? baseOps.concat(["√", "(", ")"])
      : baseOps;

  setOperators(allOps);
  setDisabledOps(dis);

  // ✅ ส่ง disabledOps เข้าไปเพื่อไม่ให้ใช้ในเฉลย
  const { expr, result } = createExpressionWithResult(selected, allOps, mode, dis);

  setDigits(selected);
  setTarget(result);
  setSolutionExpr(expr);
};

/* 🧮 CREATE EXPRESSION AND CALCULATE TARGET (SAFE & INTEGER ONLY) */
const createExpressionWithResult = (numbers, ops, mode, disabledOps = []) => {
  const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);
  const nums = shuffle([...numbers]);

  // สุ่มเครื่องหมายโดยห้ามใช้ disabled
  const allowedOps = ops.filter((op) => !disabledOps.includes(op));

  let expr = "";
  let attempts = 0;
  let result = 0;

  // 🔁 พยายามสุ่มจนกว่าจะได้จำนวนเต็ม
  while ((!Number.isInteger(result) || result <= 0) && attempts < 300) {
    attempts++;
    expr = "";

    for (let i = 0; i < nums.length; i++) {
      let n = nums[i];

      // 💡 มีโอกาสใส่ root หน้าเลขใน hard mode
      if (mode === "hard" && allowedOps.includes("√") && Math.random() < 0.3) {
        n = `√${n}`;
      }

      expr += n;

      if (i < nums.length - 1) {
        // ✅ ใช้เฉพาะเครื่องหมายที่อนุญาตเท่านั้น
        const op = allowedOps[Math.floor(Math.random() * allowedOps.length)];
        expr += op;
      }

      // 💫 โอกาสใส่วงเล็บแบบสุ่ม (แต่ไม่พัง syntax)
      if (mode === "hard" && Math.random() < 0.15 && !expr.includes("(")) expr = `(${expr}`;
      if (mode === "hard" && Math.random() < 0.15 && expr.includes("(") && !expr.endsWith(")"))
        expr += ")";
    }

    try {
      const cleanExpr = expr
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/√(\d+)/g, "Math.sqrt($1)");

      result = eval(cleanExpr);
    } catch {
      result = 0;
    }
  }

  // ถ้าไม่เจอจำนวนเต็มเลยภายใน 300 รอบ ให้ reset ใหม่ (กัน infinite loop)
  if (!Number.isInteger(result) || result <= 0) {
    return createExpressionWithResult(numbers, ops, mode, disabledOps);
  }

  return { expr, result };
};


  const startGame = (m) => {
    setMode(m);
    generateProblem(m);
    setExpression("");
    setLastWasNumber(false);
    setLastWasSqrt(false);
    setTimeLeft(m === "hard" ? 30 : 60);
    setRunning(true);
    setResultPopup(null);
    setSolution(null);
    setPage("game");
  };

  /* 🕒 TIMER */
  useEffect(() => {
    if (!running) return;
    if (timeLeft <= 0) {
      playSound("timeout");
      setRunning(false);
      stopTimer();
      setResultPopup("timeout");
      const solved = findSolution(digits, target, disabledOps);
      setSolution(solved ? solved : "No simple solution found.");
      setRounds((r) => r + 1);
      return;
    }
    timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, running]);

  const stopTimer = () => {
    clearTimeout(timerRef.current);
    setRunning(false);
  };

  /* ✅ CHECK ANSWER */
  const checkAnswer = () => {
    const usedDigits = expression.split("").filter((ch) => /\d/.test(ch));
    const allUsed = digits.every((d) => usedDigits.includes(String(d)));

    if (!allUsed) {
      setResultPopup("invalid");
      return;
    }

    try {
      // ✅ แปลง √ ให้เป็น Math.sqrt(...) และแทร่วงเล็บ
      const clean = expression
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/\^/g, "**")
        .replace(/√(\d+|\([^()]+\))/g, "Math.sqrt($1)");

        const result = eval(clean);

        // ✅ ต้องเป็นจำนวนเต็มเท่านั้น
        if (!Number.isInteger(result)) {
          setResultPopup("invalid");
          return;
        }
        
      const uniqueOK = new Set(usedDigits).size === usedDigits.length;
      const isInteger = Number.isInteger(result);

      if (isInteger && result === target && uniqueOK) {
        playSound("correct");
        setScore((s) => s + 1);
        setResultPopup("correct");
      } else {
        playSound("wrong");
        setResultPopup("wrong");
      }

      stopTimer();
      setRounds((r) => r + 1);
      setHistory((h) => [...h, { round: rounds + 1, result, ok: result === target }]);
    } catch {
      setResultPopup("invalid");
    }
  };

  /* 🧠 หาวิธีเฉลยที่ถูกต้องตามเครื่องหมายที่เปิดใช้ */
  const findSolution = (digits, target, disabledOps = []) => {
    const ops = ["+", "-", "*", "/"].filter(
      (op) => !disabledOps.includes(op === "*" ? "×" : op === "/" ? "÷" : op)
    );

    const permute = (arr) => {
      if (arr.length <= 1) return [arr];
      const result = [];
      arr.forEach((val, i) => {
        const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
        permute(rest).forEach((perm) => result.push([val, ...perm]));
      });
      return result;
    };

    const numberPerms = permute(digits);

    for (const numArr of numberPerms) {
      for (let o1 of ops)
        for (let o2 of ops)
          for (let o3 of ops)
            for (let o4 of ops) {
              const expr = `${numArr[0]}${o1}${numArr[1]}${o2}${numArr[2]}${o3}${numArr[3]}${o4}${numArr[4]}`;
              try {
                const result = eval(expr);
                if (Number.isInteger(result) && result === target) {
                  return expr
                    .replace(/\*/g, "×")
                    .replace(/\//g, "÷");
                }
              } catch {}
            }
    }
    return null;
  };


  /* ✨ Transition presets */
  const fade = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  const currentTheme = themes[theme];

  /* 🌌 MAIN UI */
  return (
    <motion.div
      key={theme}
      className="container"
      data-theme={theme}
      style={{
        background: currentTheme.background,
        color: currentTheme.text,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* 🌍 TOP CONTROLS */}
      <div className="top-controls">
        {/* 🌐 Language */}
        <div className="lang-dropdown">
          <button
            className="control-btn"
            onClick={() =>
              setDropdownOpen(dropdownOpen === "lang" ? null : "lang")
            }
          >
            <FaGlobe />
          </button>
          {dropdownOpen === "lang" && (
            <div className="dropdown-menu">
              {Object.keys(texts).map((code) => (
                <div
                  key={code}
                  className={`dropdown-item ${
                    lang === code ? "active" : ""
                  }`}
                  onClick={() => {
                    setLang(code);
                    setDropdownOpen(null);
                  }}
                >
                  {code.toUpperCase()}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 🎨 Theme */}
        <div className="theme-dropdown">
          <button
            className="control-btn"
            onClick={() =>
              setDropdownOpen(dropdownOpen === "theme" ? null : "theme")
            }
          >
            <FaPalette />
          </button>
          {dropdownOpen === "theme" && (
            <div className="dropdown-menu">
              {Object.entries(themes).map(([key, val]) => (
                <div
                  key={key}
                  className={`dropdown-item ${
                    theme === key ? "active" : ""
                  }`}
                  onClick={() => {
                    setTheme(key);
                    setDropdownOpen(null);
                  }}
                >
                  {val.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 🔊 Volume */}
        <div className="volume-dropdown">
          <button
            className="control-btn"
            onClick={() =>
              setDropdownOpen(dropdownOpen === "volume" ? null : "volume")
            }
          >
            <FaVolumeUp />
          </button>
          {dropdownOpen === "volume" && (
            <div className="dropdown-menu volume-menu">
              <div className="volume-control">
                <FaVolumeUp
                  className="volume-icon"
                  onClick={toggleMute}
                  style={{ cursor: "pointer" }}
                />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setVolume(val);
                    setMuted(val === 0);
                  }}
                  className="volume-slider"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🔙 Back Button */}
      {page !== "login" && (
        <button
          className="back-btn"
          onClick={() => {
            playSound("click");
            stopTimer();
            setPage("login");
          }}
        >
          <FaArrowLeft />
        </button>
      )}
      {/* ⚡ PAGE SWITCHER */}
      <AnimatePresence mode="wait">
        {/* LOGIN PAGE ------------------------------------------------ */}
        {page === "login" && (
          <motion.div key="login" className="login-page" {...fade}>
            <div className="glass-card">
              <h1 className="title">{T.title}</h1>
              <p className="subtitle">{T.subtitle}</p>
              <input
                type="text"
                placeholder={T.enterName}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
              <button
                className="main-btn"
                onClick={() => {
                  if (nickname.trim()) {
                    playSound("click");
                    setPage("mode");
                  }
                }}
              >
                {T.start} <FaArrowRight />
              </button>
            </div>
          </motion.div>
        )}

        {/* MODE PAGE ------------------------------------------------ */}
        {page === "mode" && (
          <motion.div key="mode" className="mode-page" {...fade}>
            <h2 className="big-player">
              {T.playerName}: <span>{nickname}</span>
            </h2>
            <h1>{T.selectMode}</h1>
            <div className="mode-buttons">
              <button
                className="mode-btn glass-btn"
                onClick={() => {
                  playSound("click");
                  startGame("easy");
                }}
              >
                {T.easy}
              </button>
              <button
                className="mode-btn glass-btn"
                onClick={() => {
                  playSound("click");
                  startGame("hard");
                }}
              >
                {T.hard}
              </button>
            </div>
          </motion.div>
        )}

        {/* GAME PAGE ------------------------------------------------ */}
        {page === "game" && (
          <motion.div key="game" className="game-page" {...fade}>
            <div className="game-header">
              <h2 className="big-player">
                {T.playerName}: <span>{nickname}</span>
              </h2>

              <div className="game-stats">
                <h1 className="target-title">
                  {T.target}: <span className="highlight">{target}</span>
                </h1>
                <p
                  className={
                    timeLeft <= 10 ? "time-score time-low" : "time-score"
                  }
                >
                  {T.timeLeft}: {timeLeft}s
                </p>
                <p>
                  {T.score}: {score}
                </p>
              </div>
            </div>

            {/* DIGITS */}
            <div className="digits-grid">
              {digits.map((n) => {
                const used = expression.includes(String(n));
                return (
                  <button
                    key={n}
                    disabled={lastWasNumber}
                    className={`digit-btn ${used ? "used" : ""}`}
                    onClick={() => {
                      playSound("click");
                      if (!used && !lastWasNumber) {
                        setExpression((p) => p + n);
                        setLastWasNumber(true);
                        setLastWasSqrt(false);
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
              {operators.map((op) => (
                <button
                  key={op}
                  disabled={
                    disabledOps.includes(op) ||
                    (op === "√" && (lastWasSqrt || lastWasNumber))
                  }
                  className={`op-btn ${
                    disabledOps.includes(op) ? "disabled" : ""
                  }`}
                  onClick={() => {
                    if (!disabledOps.includes(op)) {
                      playSound("click");
                      setExpression((p) => p + op);
                      setLastWasNumber(op === ")" ? true : false);
                      setLastWasSqrt(op === "√");
                    }
                  }}
                >
                  {op}
                </button>
              ))}
            </div>

            {/* EXPRESSION BOX */}
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
                  playSound("click");
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
                  playSound("click");
                  checkAnswer();
                }}
                disabled={digits.some(
                  (d) => !expression.includes(String(d))
                )}
              >
                {T.submit}
              </button>
            </div>

            {/* POPUP ------------------------------------------------ */}
            {resultPopup && (
              <motion.div
                className={`popup ${
                  resultPopup === "invalid" ? "invalid" : ""
                }`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 120 }}
              >
                {resultPopup === "correct" && <h2>{T.correct}</h2>}
                {resultPopup === "wrong" && <h2>{T.wrong}</h2>}
                {resultPopup === "timeout" && (
                  <>
                    <h2>{T.timeout}</h2>
                    <p className="solution-text">
                      💡 {T.correctAnswer || "Possible Solution"}: <br />
                      <span className="solution-highlight">{solutionExpr}</span>
                    </p>
                  </>
                )}

                {resultPopup === "invalid" && <h2>{T.invalidExpr}</h2>}

                <div className="popup-btns">
                  <button
                    onClick={() => {
                      playSound("click");
                      startGame(mode);
                    }}
                  >
                    <FaRedo /> {T.playAgain}
                  </button>
                  <button
                    onClick={() => {
                      playSound("click");
                      stopTimer();
                      setPage("stats");
                    }}
                  >
                    <FaSignOutAlt /> {T.exit}
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* STATS PAGE ---------------------------------------------- */}
        {page === "stats" && (
          <motion.div key="stats" {...fade} className="stats-page">
            <div className="stats-card">
              <h2 className="stats-title">{T.stats}</h2>
              <p className="player-summary">
                {T.playerName}: <strong>{nickname}</strong>
              </p>
              <p>
                {T.score}: <strong>{score}</strong>
              </p>
              <p>
                {T.rounds}: <strong>{rounds}</strong>
              </p>

              <div className="history">
                <h3>{T.history}</h3>
                <ul>
                  {history.map((h, i) => (
                    <li key={i}>
                      Round {h.round}: {h.ok ? "✅" : "❌"} ({h.result})
                    </li>
                  ))}
                </ul>
              </div>

              <div className="stats-actions">
                <button
                  className="main-btn"
                  onClick={() => {
                    playSound("click");
                    setPage("mode");
                  }}
                >
                  <FaArrowLeft /> {T.back}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
