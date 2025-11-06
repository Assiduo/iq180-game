/* =============================================================
 🧩 IQ180 React App (Fixed)
---------------------------------------------------------------
 Full file — socket in useEffect, balanced try/catch, UI preserved.
=============================================================*/

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

import { io } from "socket.io-client";

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
  const [waitingPlayers, setWaitingPlayers] = useState([]);

  /* 🔊 SOUND ENGINE */
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const clickSound = new Howl({ src: [clickSoundFile], volume: 0.6 });
  const correctSound = new Howl({ src: [correctSoundFile], volume: 0.7 });
  const wrongSound = new Howl({ src: [wrongSoundFile], volume: 0.7 });
  const timeoutSound = new Howl({ src: [timeoutSoundFile], volume: 0.6 });
  const [bgm] = useState(() => new Howl({ src: [bgmFile], loop: true }));
  const [scores, setScores] = useState({});

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
  const [totalPlayers, setTotalPlayers] = useState(0);

  const [digits, setDigits] = useState([]);
  const [operators, setOperators] = useState([]);
  const [disabledOps, setDisabledOps] = useState([]);
  const [target, setTarget] = useState(0);
  const [expression, setExpression] = useState("");

  const [resultPopup, setResultPopup] = useState(null);
  const [solution, setSolution] = useState(null);
  const [history, setHistory] = useState([]);
  const [lastWasNumber, setLastWasNumber] = useState(false);
  const [lastWasSqrt, setLastWasSqrt] = useState(false);
  const [solutionExpr, setSolutionExpr] = useState("");
  const [endByName, setEndByName] = useState(null);
  const problemRef = useRef({ digits: [], target: 0, disabledOps: [] });

  /* 👥 Multiplayer & Room State */
  const [playerList, setPlayerList] = useState([]);
  const [canStart, setCanStart] = useState(false);
  const [preGameInfo, setPreGameInfo] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [showCountdown, setShowCountdown] = useState(false);
  const [gameState, setGameState] = useState({});
  const [isMyTurn, setIsMyTurn] = useState(false);

  const [autoResumeCount, setAutoResumeCount] = useState(null);

  /* 🕒 TIMER */
  const [baseTime, setBaseTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [running, setRunning] = useState(false);
  const timerRef = useRef(null);

  /* socket ref to keep across renders and lifecycle */
  const socketRef = useRef(null);

  /* -------------------------
     create socket + attach listeners inside useEffect
     ------------------------- */
  useEffect(() => {
    // create socket once
    const s = io("http://192.168.1.166:4000");
    socketRef.current = s;

    s.on("connect", () => {
      console.log("🟢 Connected to server");
      if (page === "mode" && nickname.trim()) {
        s.emit("setNickname", nickname);
      }
    });

    s.on("playerList", (list) => {
      setPlayerList(list);
    });

    s.on("waitingList", (data) => {
      if (data.mode === mode) {
        setWaitingPlayers(data.players);
      }
    });

    s.on("canStart", (data) => {
      if (data.mode === mode) setCanStart(data.canStart);
    });

    s.on("preGameStart", (data) => {
      setPreGameInfo({
        mode: data.mode,
        starter: data.starter,
        players: data.players,
      });

      let counter = data.countdown;
      setCountdown(counter);
      setShowCountdown(true);

      const timer = setInterval(() => {
        counter -= 1;
        setCountdown(counter);
        if (counter <= 0) {
          clearInterval(timer);
          setShowCountdown(false);
        }
      }, 1000);
    });

    s.on("gameStart", (data) => {
      console.log("🚀 Game started from server:", data);

      setDigits(data.digits || []);
      setOperators(data.operators || []);
      setDisabledOps(data.disabledOps || []);
      setTarget(data.target || 0);
      setMode(data.mode || "easy");
      setSolutionExpr(data.expr || "");

      problemRef.current = {
        digits: data.digits || [],
        target: data.target || 0,
        disabledOps: data.disabledOps || [],
      };
      setSolutionExpr("");

      const list =
        Array.isArray(data.players) && data.players.length > 0
          ? data.players
          : Array.isArray(data.turnOrder)
          ? data.turnOrder
          : [];
      const uniquePlayers = Array.from(new Set([...list, nickname]));
      setScores(Object.fromEntries(uniquePlayers.map((p) => [p, 0])));

      setGameState(data);
      const myTurn = data.currentTurn === nickname;
      setIsMyTurn(myTurn);

      setPage("game");

      if (myTurn) {
        setRunning(true);
        setTimeLeft(data.mode === "hard" ? 30 : 8);
      } else {
        setRunning(false);
        setTimeLeft(data.mode === "hard" ? 30 : 60);
      }

      setExpression("");
      setLastWasNumber(false);
      setLastWasSqrt(false);
      setResultPopup(null);
      setSolution(null);
      setScore(0);
      setRounds(0);

      console.log("🎯 Current turn:", data.currentTurn);
    });

    s.on("newRound", (data) => {
      setDigits(data.digits);
      setOperators(data.operators);
      setDisabledOps(data.disabledOps);
      setTarget(data.target);
      setRounds(data.round);
      setExpression("");
      setLastWasNumber(false);
      setResultPopup(null);
      setSolutionExpr(data.expr || "No valid solution from server");

      problemRef.current = {
        digits: data.digits,
        target: data.target,
        disabledOps: data.disabledOps,
      };
      setSolutionExpr("");
    });

    s.on("turnSwitch", (data) => {
      console.log("🔁 Turn switched:", data);

      setGameState((prev) => ({
        ...prev,
        currentTurn: data.nextTurn,
      }));

      if (data.round !== undefined) {
        setRounds(data.round);
        console.log(`📦 Synced round from server: ${data.round}`);
      }

      setIsMyTurn(data.nextTurn === nickname);
      setRunning(false);
    });

    s.on("gameover", (data) => {
      console.log("💀 Game over:", data);
      setEndByName(data?.by || null);
      setResultPopup("gameover");
      stopTimer();
      setRunning(false);
    });

    s.on("yourTurn", ({ mode: m }) => {
      console.log("🧩 It's now your turn to generate a problem!");

      const gameData = generateProblem(m);
      setDigits(gameData.digits);
      setOperators(gameData.operators);
      setDisabledOps(gameData.disabledOps);
      setTarget(gameData.target);
      setMode(gameData.mode);

      problemRef.current = {
        digits: gameData.digits,
        target: gameData.target,
        disabledOps: gameData.disabledOps,
      };

      setRunning(true);
      setIsMyTurn(true);
      setExpression("");
      setLastWasNumber(false);
      setLastWasSqrt(false);
      setResultPopup(null);
      setSolution(null);
      setPage("game");

      setDisabledOps([]);
      setResultPopup(null);
      setExpression("");
      setLastWasNumber(false);
      setLastWasSqrt(false);
      setSolutionExpr("");
      setRunning(true);

      setGameState((prev) => ({ ...prev, currentTurn: nickname }));

      console.log("🎮 Your turn started with target:", gameData.target);
    });

    s.on("answerResult", (data) => {
      console.log("📩 Answer result:", data);

      setScores((prev) => {
        const next = { ...prev };
        if (!(data.nickname in next)) next[data.nickname] = 0;
        if (data.correct) next[data.nickname] += 1;
        return next;
      });

      if (data.round !== undefined) setRounds(data.round);

      if (data.nickname !== nickname) {
        if (data.correct) console.log(`✅ ${data.nickname} answered correctly!`);
        else console.log(`❌ ${data.nickname} answered wrong.`);
      }
    });

    s.on("playerLeft", (data) => {
      console.log(`🚪 ${data.nickname} left ${data.mode}`);
      if (data.mode === mode) {
        setWaitingPlayers((prev) => prev.filter((p) => p !== data.nickname));
      }
    });

    // cleanup
    return () => {
      s.off();
      s.disconnect();
      socketRef.current = null;
    };
    // Dependencies left intentionally broad so socket recreates only when page/mode/nickname meaningfully change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nickname, mode, page]);

  /* -------------------------
     Timer ticking (client-side sync)
     ------------------------- */
  useEffect(() => {
    if (!running || baseTime === null) return;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - baseTime) / 1000);
      const remaining = Math.max(60 - elapsed, 0);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current);
        setRunning(false);
        playSound("timeout");

        const { digits: pd, target: pt, disabledOps: pdo } = problemRef.current;
        const sol = findSolution(pd, pt, pdo);
        setSolutionExpr(sol || "No valid solution found");

        setResultPopup("timeout");

        socketRef.current?.emit("answerResult", {
          nickname,
          result: "timeout",
          correct: false,
          score,
          round: rounds + 1,
          mode,
        });

        let count = 3;
        setAutoResumeCount(count);
        const countdown = setInterval(() => {
          count -= 1;
          setAutoResumeCount(count);
          if (count <= 0) {
            clearInterval(countdown);
            setAutoResumeCount(null);
            setResultPopup(null);
            if (isMyTurn) {
              socketRef.current?.emit("resumeGame", { mode });
              setIsMyTurn(false);
            }
          }
        }, 1000);
      }
    };

    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
    // include relevant deps
  }, [running, baseTime, isMyTurn, rounds, score, mode]);

  /* ============================
     findSolution helper
     ============================ */
  const findSolution = (digitsArr = [], targetVal = 0, disabled = []) => {
    const ops = ["+", "-", "*", "/"].filter(
      (op) => !disabled.includes(op === "*" ? "×" : op === "/" ? "÷" : op)
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

    const numberPerms = permute(digitsArr);

    for (const numArr of numberPerms) {
      for (let o1 of ops)
        for (let o2 of ops)
          for (let o3 of ops)
            for (let o4 of ops) {
              const expr = `${numArr[0]}${o1}${numArr[1]}${o2}${numArr[2]}${o3}${numArr[3]}${o4}${numArr[4]}`;
              try {
                const result = eval(expr);
                if (Number.isInteger(result) && result === targetVal) {
                  return expr.replace(/\*/g, "×").replace(/\//g, "÷");
                }
              } catch {}
            }
    }
    return null;
  };

  /* ============================
     stubs: generateProblem & startGame (replace with real impl)
     ============================ */
  const generateProblem = (m = "easy") => {
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

  const startGame = (m) => {
    socketRef.current?.emit("startGame", { mode: m, nickname });
  };

  /* ============================
     CHECK ANSWER (balanced try/catch)
     ============================ */
  const checkAnswer = () => {
    try {
      const expr = expression.trim();

      // 🧩 Basic validation
      if (!/\d/.test(expr)) {
        setResultPopup("invalid");
        return;
      }
      if (/^[+\-×÷*/)]/.test(expr)) {
        setResultPopup("invalid");
        return;
      }
      if (/[+\-×÷*/(]$/.test(expr)) {
        setResultPopup("invalid");
        return;
      }

      const clean = expr
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/\^/g, "**")
        .replace(/√(\d+|\([^()]+\))/g, "Math.sqrt($1)");

      // eslint-disable-next-line no-eval
      const evalResult = eval(clean);
      const correct =
        Number.isFinite(evalResult) && Math.abs(evalResult - target) < 1e-9;

      if (correct) {
        playSound("correct");
        setScore((s) => s + 1);
        setResultPopup("correct");
        setSolutionExpr("");
      } else {
        playSound("wrong");
        setResultPopup("wrong");
        const sol = findSolution(digits, target, disabledOps);
        setSolutionExpr(sol || "No valid solution found");
      }

      setHistory((h) => [...h, { round: rounds + 1, result: evalResult, ok: correct }]);

      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("answerResult", {
          nickname,
          mode,
          result: evalResult,
          correct,
          score: correct ? score + 1 : score,
          round: rounds + 1,
        });
      }

      let count = 3;
      setAutoResumeCount(count);
      const resumeTimer = setInterval(() => {
        count -= 1;
        setAutoResumeCount(count);
        if (count <= 0) {
          clearInterval(resumeTimer);
          setAutoResumeCount(null);
          setResultPopup(null);
          if (isMyTurn) {
            socketRef.current?.emit("resumeGame", { mode });
            setIsMyTurn(false);
          }
        }
      }, 1000);
    } catch (err) {
      console.error("❌ Expression error:", err);
      setResultPopup("invalid");
    }
  };

  /* 🛑 STOP TIMER (safe) */
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  /* 👑 HOST CHECK */
  const isHost = gameState?.turnOrder?.[0] === nickname;

  /* 🧨 END / LEAVE */
  const endGameForAll = () => {
    if (resultPopup === "gameover") return;
    try {
      playSound("click");
    } catch {}
    stopTimer();
    setRunning(false);
    setResultPopup("gameover");
    socketRef.current?.emit("endGame", { mode, by: nickname, reason: "endedByPlayer" });
  };

  const leaveGame = () => {
    try {
      playSound("click");
    } catch {}
    stopTimer();
    setRunning(false);
    setResultPopup("gameover");
    socketRef.current?.emit("playerLeftGame", { nickname, mode });
  };

  /* ✨ Transition presets */
  const fade = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  const currentTheme = themes[theme];

  /* ============================
     RENDER — preserved your original UI
     ============================ */
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
                  className={`dropdown-item ${lang === code ? "active" : ""}`}
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
                  className={`dropdown-item ${theme === key ? "active" : ""}`}
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

      {/* Back button */}
      {page !== "login" && (
        <button
          className="back-btn"
          onClick={() => {
            playSound("click");

            if (page === "game") {
              stopTimer();

              const activeMode = gameState?.mode || mode;

              socketRef.current?.emit("playerLeftGame", {
                nickname,
                mode: activeMode,
              });

              setRunning(false);
              setIsMyTurn(false);
              setPage("mode");
            } else if (page === "waiting" || page === "mode") {
              socketRef.current?.emit("leaveLobby", nickname);
              socketRef.current?.disconnect();
              setPage("login");
            } else {
              setPage("login");
            }
          }}
        >
          <FaArrowLeft />
        </button>
      )}

      {/* ⚡ PAGE SWITCHER */}
      <AnimatePresence mode="wait">
        {/* LOGIN PAGE */}
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
                    socketRef.current?.emit("setNickname", nickname);
                    setPage("mode");
                  }
                }}
              >
                {T.start} <FaArrowRight />
              </button>
            </div>
          </motion.div>
        )}

        {/* MODE PAGE */}
        {page === "mode" && (
          <motion.div key="mode" className="mode-page" {...fade}>
            <h2 className="big-player">
              {T.playerName}: <span>{nickname}</span>
            </h2>

            <div className="online-box glass-card">
              <h3 className="online-title">
                👥 {lang === "th" ? "ผู้เล่นที่ออนไลน์" : lang === "zh" ? "在线玩家" : "Players Online"}
              </h3>

              {playerList && playerList.length > 0 ? (
                <ul className="online-list">
                  {playerList.map((p, i) => (
                    <li key={i} className={p === nickname ? "self" : ""}>
                      {p === nickname ? (
                        <span className="you-label">
                          {lang === "th" ? "คุณ" : lang === "zh" ? "你" : "You"}
                        </span>
                      ) : (
                        p
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="online-empty">
                  {lang === "th"
                    ? "ไม่มีผู้เล่นออนไลน์"
                    : lang === "zh"
                    ? "暂无在线玩家"
                    : "No players online"}
                </p>
              )}
            </div>

            <h1 className="select-mode-title">{T.selectMode}</h1>

            <div className="mode-buttons">
              <button
                className="mode-btn glass-btn"
                onClick={() => {
                  playSound("click");
                  setMode("easy");
                  socketRef.current?.emit("joinGame", { nickname, mode: "easy" });
                  setPage("waiting");
                }}
              >
                {T.easy}
              </button>

              <button
                className="mode-btn glass-btn"
                onClick={() => {
                  playSound("click");
                  setMode("hard");
                  socketRef.current?.emit("joinGame", { nickname, mode: "hard" });
                  setPage("waiting");
                }}
              >
                {T.hard}
              </button>
            </div>
          </motion.div>
        )}

        {/* WAITING PAGE */}
        {page === "waiting" && (
          <motion.div key="waiting" className="waiting-page" {...fade}>
            <h1 className="waiting-title">
              {waitingPlayers.length > 1
                ? lang === "th"
                  ? "พร้อมเริ่มเกม!"
                  : lang === "zh"
                  ? "准备开始游戏！"
                  : "Ready to Start!"
                : lang === "th"
                ? "⏳ รอผู้เล่น..."
                : lang === "zh"
                ? "⏳ 等待玩家..."
                : "⏳ Waiting for players..."}
            </h1>

            <h2>
              {lang === "th" ? "โหมด" : lang === "zh" ? "模式" : "Mode"}:{" "}
              <span className="highlight">{mode === "easy" ? T.easy : T.hard}</span>
            </h2>

            <div className="waiting-box glass-card">
              {waitingPlayers.length > 0 ? (
                <ul>{waitingPlayers.map((p, i) => <li key={i}>{p}</li>)}</ul>
              ) : (
                <p>
                  {lang === "th"
                    ? "ยังไม่มีผู้เล่นในห้องนี้"
                    : lang === "zh"
                    ? "该房间暂无玩家"
                    : "No players yet"}
                </p>
              )}
            </div>

            {waitingPlayers.length > 1 && (
              <button
                className="main-btn"
                onClick={() => {
                  socketRef.current?.emit("startGame", { mode, nickname });
                }}
              >
                🚀 {lang === "th" ? "เริ่มเกม" : lang === "zh" ? "开始游戏" : "Start Game"}
              </button>
            )}

            <button
              className="secondary-btn"
              onClick={() => {
                playSound("click");
                socketRef.current?.emit("leaveGame", { nickname, mode });
                setPage("mode");
              }}
            >
              ← {lang === "th" ? "ออกจากห้อง" : lang === "zh" ? "离开房间" : "Leave Room"}
            </button>
          </motion.div>
        )}

        {/* PRE-GAME POPUP */}
        {preGameInfo && countdown > 0 && (
          <motion.div
            key="preGame"
            className="popup countdown-popup"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 120 }}
          >
            <h2>
              {lang === "th"
                ? `${preGameInfo.starter} เริ่มเกม!`
                : lang === "zh"
                ? `${preGameInfo.starter} 开始了游戏！`
                : `${preGameInfo.starter} started the game!`}
            </h2>
            <h1 className="countdown-number">{countdown}</h1>
          </motion.div>
        )}

        {/* GAME PAGE */}
        {page === "game" && (
          <motion.div key="game" className="game-page" {...fade}>
            {/* YOUR FULL GAME UI (unchanged) */}
            <div className="game-header">
              <h2 className="big-player">
                {T.playerName}: <span>{nickname}</span>
              </h2>

              <div
                style={{
                  position: "fixed",
                  left: "50%",
                  bottom: 16,
                  transform: "translateX(-50%)",
                  display: "flex",
                  gap: 12,
                  justifyContent: "center",
                  alignItems: "center",
                  flexWrap: "wrap",
                  zIndex: 20,
                  padding: "8px 12px",
                  borderRadius: 12,
                  backdropFilter: "blur(6px)",
                }}
              >
                <button className="glass-btn" onClick={leaveGame}>
                  <FaSignOutAlt /> {lang === "th" ? "จบเกม" : lang === "zh" ? "结束游戏" : "End Game"}
                </button>

                {isHost && (
                  <button
                    className="glass-btn"
                    style={{ borderColor: "rgba(255,100,100,0.6)" }}
                    onClick={endGameForAll}
                  >
                    🛑 {lang === "th" ? "จบเกม" : lang === "zh" ? "结束游戏" : "End Game"}
                  </button>
                )}
              </div>

              {isMyTurn ? (
                <>
                  <h3 className="turn-status">🎯 It's your turn!</h3>

                  <div className="game-stats">
                    <p className="round-display">
                      Round: <span className="highlight">{rounds}</span>
                    </p>
                    <h1 className="target-title">
                      {T.target}: <span className="highlight">{target}</span>
                    </h1>
                    <p className={timeLeft <= 10 ? "time-score time-low" : "time-score"}>
                      {T.timeLeft}: {timeLeft}s
                    </p>
                    <p>
                      {T.score}: {score}
                    </p>
                  </div>
                </>
              ) : (
                <div className="waiting-header">
                  <h3 className="turn-status">
                    ⏳ Waiting for <span className="highlight">{gameState?.currentTurn}</span>...
                  </h3>
                  <h1 className={`waiting-time ${timeLeft <= 10 ? "time-critical" : ""}`}>
                    {timeLeft > 0 ? `${timeLeft}s` : "00s"}
                  </h1>
                </div>
              )}
            </div>

            {!isMyTurn ? (
              <div className="waiting-turn glass-card">
                <h2 className="waiting-title">
                  ⏳ Waiting for <span className="highlight">{gameState?.currentTurn}</span>...
                </h2>

                <div className="waiting-timer">
                  <h1 className={`time-left ${timeLeft <= 10 ? "time-critical" : ""}`}>
                    {timeLeft > 0 ? `${timeLeft}s` : "00s"}
                  </h1>
                </div>

                <p className="hint-text">Please wait until it's your turn to play.</p>
              </div>
            ) : (
              <>
                <div className="digits-grid">
                  {digits.map((n) => {
                    const used = expression.includes(String(n));
                    return (
                      <button
                        key={n}
                        disabled={lastWasNumber || used}
                        className={`digit-btn ${used ? "used" : ""}`}
                        onClick={() => {
                          playSound("click");
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
                      <button
                        key={op}
                        disabled={isDisabled}
                        className={className}
                        onClick={() => {
                          if (isDisabled) return;
                          playSound("click");

                          setExpression((prev) => prev + op);

                          if (["+", "-", "×", "÷", "(", "√"].includes(op)) {
                            setLastWasNumber(false);
                          } else if (op === ")") {
                            setLastWasNumber(true);
                          }
                        }}
                      >
                        {op}
                      </button>
                    );
                  })}
                </div>

                <input className="expression-box" readOnly value={expression} placeholder={T.buildEq} />

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
                    disabled={digits.some((d) => !expression.includes(String(d)))}
                  >
                    {T.submit}
                  </button>
                </div>
              </>
            )}

            {resultPopup && resultPopup !== "endRound" && (
              <motion.div
                className={`popup ${resultPopup === "invalid" ? "invalid" : ""}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 120 }}
              >
                {resultPopup === "correct" && <h2>{T.correct}</h2>}

                {resultPopup === "wrong" && (
                  <>
                    <h2>{T.wrong}</h2>
                    <p className="solution-text">
                      💡 {T.solution}: <br />
                      <span className="solution-highlight">{solutionExpr}</span>
                    </p>
                  </>
                )}

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

                {resultPopup === "gameover" && (
                  <>
                    <h2>💀 Game Over</h2>
                    {endByName && (
                      <p className="solution-text">
                        🛑 {lang === "th" ? "จบเกมโดย" : lang === "zh" ? "由以下玩家结束：" : "Ended by"}:
                        <span className="solution-highlight"> {endByName}</span>
                      </p>
                    )}
                    <p className="solution-text">Not enough players to continue.</p>
                  </>
                )}

                {autoResumeCount !== null && (
                  <p className="resume-count">
                    Resuming next turn in <span className="highlight">{autoResumeCount}</span>s...
                  </p>
                )}

                {autoResumeCount === null && (
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
                )}
              </motion.div>
            )}
          </motion.div>
        )}

        {resultPopup === "endRound" && (
          <motion.div className="popup" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 120 }}>
            <h2>🏁 End of Round {rounds}</h2>
            <p className="solution-text">
              {lang === "th" ? "รอบนี้จบแล้ว! พร้อมเริ่มรอบถัดไปหรือไม่?" : "Round complete! Ready for the next one?"}
            </p>
            <div className="popup-btns">
              <button
                onClick={() => {
                  playSound("click");
                  socketRef.current?.emit("resumeGame", { mode });
                  setResultPopup(null);
                }}
              >
                <FaRedo /> {T.playAgain}
              </button>
              <button
                onClick={() => {
                  playSound("click");
                  socketRef.current?.emit("playerLeftGame", { nickname, mode });
                  setPage("login");
                }}
              >
                <FaSignOutAlt /> {T.exit}
              </button>
            </div>
          </motion.div>
        )}

        {page === "stats" && (
          <motion.div key="stats" {...fade} className="stats-page">
            <div className="stats-card">
              <h2 className="stats-title">{T.stats}</h2>

              {(() => {
                const entries = Object.entries(scores ?? {});
                const turnOrder = Array.isArray(gameState?.turnOrder) ? gameState.turnOrder : [];
                const waiters = Array.isArray(waitingPlayers) ? waitingPlayers : [];
                const basePlayers = [...new Set([...turnOrder, ...waiters, nickname].filter(Boolean))];

                const rowsRaw = entries.length > 0 ? entries : basePlayers.map((name) => [name, 0]);

                if (rowsRaw.length === 0) {
                  return (
                    <p style={{ textAlign: "center", marginTop: 12 }}>
                      {lang === "th" ? "ยังไม่มีผู้เล่น" : lang === "zh" ? "暂无玩家" : "No players yet"}
                    </p>
                  );
                }

                const sorted = [...rowsRaw].sort((a, b) => b[1] - a[1]);
                const [winName, winScore] = sorted[0];

                return (
                  <>
                    <div className="winner-banner" style={{ margin: "8px 0 16px", textAlign: "center" }}>
                      <h3 style={{ margin: 0 }}>
                        🏆 {lang === "th" ? "ผู้ชนะ" : lang === "zh" ? "获胜者" : "Winner"}:{" "}
                        <span className="highlight">{winName}</span>
                      </h3>
                      <p style={{ marginTop: 6 }}>
                        {lang === "th" ? "คะแนน" : lang === "zh" ? "分数" : "Score"}: <strong>{winScore}</strong>
                      </p>
                    </div>

                    <div className="scoreboard glass-card" style={{ padding: 16 }}>
                      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px" }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: "left" }}>{lang === "th" ? "ผู้เล่น" : lang === "zh" ? "玩家" : "Player"}</th>
                            <th style={{ textAlign: "right" }}>{lang === "th" ? "คะแนน" : lang === "zh" ? "分数" : "Score"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sorted.map(([name, sc]) => (
                            <tr key={name}>
                              <td>
                                {name === nickname ? <span className="you-label" style={{ marginRight: 6 }}>{lang === "th" ? "คุณ" : lang === "zh" ? "你" : "You"}</span> : null}
                                {name}
                                {name === winName && <span style={{ marginLeft: 8 }}>🏆</span>}
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <strong>{sc}</strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}

              <div className="stats-actions" style={{ marginTop: 16 }}>
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
