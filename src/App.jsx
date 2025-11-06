/* =============================================================
 🧩 IQ180 React App (Production-ready Clean Code)
---------------------------------------------------------------
 Single-file React component for the IQ180 multiplayer UI.
 - Socket.IO client connection
 - Host-synced timer
 - Validation & answer checking + auto-solve
 - Multilingual texts & themes
 - Simple local problem generator fallback
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

/* ---------- Config ---------- */
// Use env var VITE_SERVER_URL or fallback to localhost
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";
const socket = io(SERVER_URL, { autoConnect: true, transports: ["websocket", "polling"] });

/* ---------- Component ---------- */
export default function App() {
  /* -------------------
     MULTI-LANGUAGE & THEMES
     ------------------- */
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
      delete: "Clear",
      submit: "Submit",
      correct: "✅ Correct!",
      late: "⏳ Too Late!",
      wrong: "❌ Wrong!",
      timeout: "⏰ Time’s Up!",
      playAgain: "Play Again",
      exit: "Exit",
      back: "Back",
      stats: "Stats Summary",
      history: "History",
      rounds: "Rounds Played",
      notEnough: "Use all digits before submitting!",
      invalidExpr: "Invalid Expression. Each number must be followed by an operator.",
      buildEq: "Build your equation...",
      playerName: "Player Name",
      solution: "Possible Solution",
      admin: "Admin",
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
      late: "⏳ สายไปแล้ว!",
      wrong: "❌ ผิด!",
      timeout: "⏰ หมดเวลา!",
      playAgain: "เล่นต่อ",
      exit: "ออกจากเกม",
      back: "ย้อนกลับ",
      stats: "สรุปผลการเล่น",
      history: "ประวัติการเล่น",
      rounds: "จำนวนรอบทั้งหมด",
      notEnough: "ต้องใช้เลขทั้งหมดก่อนกดส่งคำตอบ!",
      invalidExpr: "รูปแบบสมการไม่ถูกต้อง ต้องมีเครื่องหมายคั่นระหว่างเลข",
      buildEq: "สร้างสมการของคุณ...",
      playerName: "ชื่อผู้เล่น",
      solution: "วิธีเฉลยที่เป็นไปได้",
      admin: "แอดมิน",
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
      late: "⏳ 太迟了!",
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
      admin: "管理",
    },
  };
  const T = texts[lang];

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

  /* -------------------
     SOUND ENGINE
     ------------------- */
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted, volume]);

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
    const sounds = { click: clickSound, correct: correctSound, wrong: wrongSound, timeout: timeoutSound };
    sounds[type]?.play();
  };

  /* -------------------
     GAME STATE
     ------------------- */
  const [page, setPage] = useState("login");
  const [nickname, setNickname] = useState("");
  const [mode, setMode] = useState("easy");
  const [score, setScore] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);

  const [digits, setDigits] = useState([]);
  const [operators, setOperators] = useState(["+", "-", "×", "÷", "(", ")", "√"]);
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

  /* -------------------
     MULTIPLAYER / ROOM
     ------------------- */
  const [playerList, setPlayerList] = useState([]);
  const [waitingPlayers, setWaitingPlayers] = useState([]);
  const [canStart, setCanStart] = useState(false);
  const [preGameInfo, setPreGameInfo] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [showCountdown, setShowCountdown] = useState(false);
  const [gameState, setGameState] = useState({});
  const [isMyTurn, setIsMyTurn] = useState(false);

  const [autoResumeCount, setAutoResumeCount] = useState(null);
  const [reactionPopup, setReactionPopup] = useState(null);
  const [personalBest, setPersonalBest] = useState(0);

  /* -------------------
     TIMER (host-synced)
     ------------------- */
  const [baseTime, setBaseTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [running, setRunning] = useState(false);
  const timerRef = useRef(null);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRunning(false);
    setBaseTime(null);
  };

  const startGame = (playMode = mode) => {
    // If host triggers a new game locally, inform server.
    socket.emit("startGame", { mode: playMode, nickname });
  };

  /* -------------------
     small local problem generator (fallback)
     ------------------- */
  const generateProblem = (m = "easy") => {
    // simple generator to avoid undefined errors when server isn't providing problems
    const nums = [];
    while (nums.length < 5) nums.push(Math.floor(Math.random() * 9) + 1);
    const ops = ["+", "-", "×", "÷"];
    const disabled = m === "hard" ? [] : [];
    // Pick a target by combining randomly
    const expr = `${nums[0]}+${nums[1]}+${nums[2]}+${nums[3]}+${nums[4]}`;
    // eslint-disable-next-line no-eval
    const targetVal = Math.round(eval(expr));
    return { digits: nums, operators: ops, disabledOps: disabled, target: targetVal, mode: m };
  };

  /* -------------------
     findSolution solver (brute force for 5 numbers)
     ------------------- */
  const findSolution = (digitsArr = [], tgt = 0, disabled = []) => {
    if (!Array.isArray(digitsArr) || digitsArr.length === 0) return null;
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
                // eslint-disable-next-line no-eval
                const result = eval(expr);
                if (Number.isFinite(result) && Math.abs(result - tgt) < 1e-9) {
                  return expr.replace(/\*/g, "×").replace(/\//g, "÷");
                }
              } catch {}
            }
    }
    return null;
  };

  /* -------------------
     SOCKET.IO BINDINGS (single useEffect)
     ------------------- */
  useEffect(() => {
    if (!socket) return;

    // connect
    const onConnect = () => {
      console.log("🟢 Connected to server:", SERVER_URL);
      if (page === "mode" && nickname.trim()) {
        socket.emit("setNickname", nickname);
      }
    };

    const onPlayerList = (list) => {
      setPlayerList(Array.isArray(list) ? list : []);
    };

    const onWaitingList = (data) => {
      if (!data) return;
      if (data.mode === mode) setWaitingPlayers(Array.isArray(data.players) ? data.players : []);
    };

    const onCanStart = (data) => {
      if (!data) return;
      if (data.mode === mode) setCanStart(data.canStart);
    };

    const onPreGameStart = (data) => {
      if (!data) return;
      setPreGameInfo({ mode: data.mode, starter: data.starter, players: data.players });
      let counter = data.countdown ?? 3;
      setCountdown(counter);
      setShowCountdown(true);
      const t = setInterval(() => {
        counter -= 1;
        setCountdown(counter);
        if (counter <= 0) {
          clearInterval(t);
          setShowCountdown(false);
        }
      }, 1000);
    };

    const onGameStart = (data) => {
      if (!data) return;
      setDigits(data.digits || []);
      setOperators(data.operators || operators);
      setDisabledOps(data.disabledOps || []);
      setTarget(data.target || 0);
      setMode(data.mode || "easy");
      problemRef.current = {
        digits: data.digits || [],
        target: data.target || 0,
        disabledOps: data.disabledOps || [],
      };
      setSolutionExpr("");
      const list = Array.isArray(data.players) && data.players.length > 0 ? data.players : Array.isArray(data.turnOrder) ? data.turnOrder : [];
      const uniquePlayers = Array.from(new Set([...list, nickname].filter(Boolean)));
      setScores(Object.fromEntries(uniquePlayers.map((p) => [p, 0])));
      setGameState(data);
      const myTurn = data.currentTurn === nickname;
      setIsMyTurn(myTurn);
      setPage("game");
      setExpression("");
      setLastWasNumber(false);
      setLastWasSqrt(false);
      setResultPopup(null);
      setSolution(null);
      setScore(0);
      setRounds(0);
      setTimeLeft(data.mode === "hard" ? 30 : 60);
      setRunning(myTurn);
      console.log("🚀 Game started:", data);
    };

    const onNewRound = (d) => {
      if (!d) return;
      setDigits(d.digits || []);
      setOperators(d.operators || operators);
      setDisabledOps(d.disabledOps || []);
      setTarget(d.target || 0);
      if (d.round !== undefined) setRounds(d.round);
      setExpression("");
      setLastWasNumber(false);
      setResultPopup(null);
      problemRef.current = {
        digits: d.digits || [],
        target: d.target || 0,
        disabledOps: d.disabledOps || [],
      };
      setSolutionExpr("");
    };

    const onTurnSwitch = (d) => {
      if (!d) return;
      setGameState((prev) => ({ ...prev, currentTurn: d.nextTurn }));
      if (d.round !== undefined) setRounds(d.round);
      setIsMyTurn(d.nextTurn === nickname);
      setRunning(false);
    };

    const onSyncTimer = ({ mode: syncMode, startTime }) => {
      if (!startTime) return;
      setBaseTime(startTime);
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const roundTime = syncMode === "hard" ? 30 : 60;
      const remaining = Math.max(roundTime - elapsed, 0);
      setTimeLeft(remaining);
      setRunning(true);
    };

    const onYourTurn = ({ mode: myMode }) => {
      // If server informs it's your turn and sends no problem, generate fallback
      console.log("🎯 yourTurn from server");
      setIsMyTurn(true);
      if (!problemRef.current || (Array.isArray(problemRef.current.digits) && problemRef.current.digits.length === 0)) {
        const g = generateProblem(myMode);
        setDigits(g.digits);
        setOperators(g.operators);
        setDisabledOps(g.disabledOps);
        setTarget(g.target);
        problemRef.current = { digits: g.digits, target: g.target, disabledOps: g.disabledOps };
      }
      setRunning(true);
      setExpression("");
      setLastWasNumber(false);
      setLastWasSqrt(false);
      setResultPopup(null);
      setSolution(null);
      setPage("game");
    };

    const onAnswerResult = (data) => {
      if (!data) return;
      // update scoreboard locally
      setScores((prev) => {
        const next = { ...(prev || {}) };
        if (!(data.nickname in next)) next[data.nickname] = 0;
        if (data.correct) next[data.nickname] += 1;
        return next;
      });
      if (data.round !== undefined) setRounds(data.round);
      if (data.nickname !== nickname) {
        console.log(`📩 ${data.nickname} answered: ${data.correct ? "correct" : "wrong"}`);
      }
    };

    const onGameOver = (data) => {
      console.log("💀 gameover", data);
      setEndByName(data?.by || null);
      setResultPopup("gameover");
      stopTimer();
      setRunning(false);
    };

    const onPlayerLeft = (d) => {
      if (!d) return;
      if (d.mode === mode) {
        setWaitingPlayers((prev) => prev.filter((p) => p !== d.nickname));
      }
    };

    const onReaction = (d) => {
      if (!d) return;
      setReactionPopup(`${d.from}: ${d.emoji}`);
      setTimeout(() => setReactionPopup(null), 2000);
    };

    const onPersonalBest = (d) => {
      if (d?.best !== undefined) setPersonalBest(d.best);
    };

    // Bind
    socket.on("connect", onConnect);
    socket.on("playerList", onPlayerList);
    socket.on("waitingList", onWaitingList);
    socket.on("canStart", onCanStart);
    socket.on("preGameStart", onPreGameStart);
    socket.on("gameStart", onGameStart);
    socket.on("newRound", onNewRound);
    socket.on("turnSwitch", onTurnSwitch);
    socket.on("syncTimer", onSyncTimer);
    socket.on("yourTurn", onYourTurn);
    socket.on("answerResult", onAnswerResult);
    socket.on("gameover", onGameOver);
    socket.on("playerLeft", onPlayerLeft);
    socket.on("reaction", onReaction);
    socket.on("personalBest", onPersonalBest);

    // cleanup
    return () => {
      socket.off("connect", onConnect);
      socket.off("playerList", onPlayerList);
      socket.off("waitingList", onWaitingList);
      socket.off("canStart", onCanStart);
      socket.off("preGameStart", onPreGameStart);
      socket.off("gameStart", onGameStart);
      socket.off("newRound", onNewRound);
      socket.off("turnSwitch", onTurnSwitch);
      socket.off("syncTimer", onSyncTimer);
      socket.off("yourTurn", onYourTurn);
      socket.off("answerResult", onAnswerResult);
      socket.off("gameover", onGameOver);
      socket.off("playerLeft", onPlayerLeft);
      socket.off("reaction", onReaction);
      socket.off("personalBest", onPersonalBest);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nickname, page, mode]);

  /* -------------------
     Host-synced ticker
     ------------------- */
  useEffect(() => {
    if (!running || baseTime === null) return;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - baseTime) / 1000);
      const roundTime = mode === "hard" ? 30 : 60;
      const remaining = Math.max(roundTime - elapsed, 0);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        stopTimer();
        playSound("timeout");
        setResultPopup("timeout");

        const { digits: pdigits, target: pt, disabledOps: pdisabled } = problemRef.current;
        try {
          const sol = findSolution(pdigits || [], pt || 0, pdisabled || []);
          setSolutionExpr(sol || "No valid solution found");
        } catch {
          setSolutionExpr("No valid solution found");
        }

        // notify server
        socket.emit("answerResult", {
          nickname,
          result: "timeout",
          correct: false,
          score,
          round: rounds + 1,
          mode,
        });

        // auto-resume
        let count = 3;
        setAutoResumeCount(count);
        const t = setInterval(() => {
          count -= 1;
          setAutoResumeCount(count);
          if (count <= 0) {
            clearInterval(t);
            setAutoResumeCount(null);
            setResultPopup(null);
            socket.emit("resumeGame", { mode });
            setIsMyTurn(false);
          }
        }, 1000);
      }
    };

    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, baseTime, mode, nickname, rounds]);

  /* -------------------
     CHECK ANSWER
     ------------------- */
  const checkAnswer = () => {
    try {
      const expr = expression.trim();

      // basic validation
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

      // evaluate (beware eval)
      // eslint-disable-next-line no-eval
      const result = eval(clean);
      const correct = Number.isFinite(result) && Math.abs(result - target) < 1e-9;

      if (correct) {
        playSound("correct");
        setScore((s) => s + 1);
        setResultPopup("correct");
        setSolutionExpr("");
      } else {
        playSound("wrong");
        setResultPopup("wrong");
        try {
          const sol = findSolution(digits, target, disabledOps);
          setSolutionExpr(sol || "No valid solution found");
        } catch (err) {
          console.error("findSolution error", err);
          setSolutionExpr("No valid solution found");
        }
      }

      setHistory((h) => [...h, { round: rounds + 1, result, ok: correct }]);

      if (socket && socket.connected) {
        socket.emit("answerResult", {
          nickname,
          mode,
          result,
          correct,
          score: correct ? score + 1 : score,
          round: rounds + 1,
        });
      }

      // start short auto-resume (3s)
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      let count = 3;
      setAutoResumeCount(count);
      timerRef.current = setInterval(() => {
        count -= 1;
        setAutoResumeCount(count);
        if (count <= 0) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          setAutoResumeCount(null);
          setResultPopup(null);
          if (isMyTurn) {
            socket.emit("resumeGame", { mode });
            setIsMyTurn(false);
          }
        }
      }, 1000);
    } catch (err) {
      console.error("❌ checkAnswer unexpected error:", err);
      setResultPopup("invalid");
      setSolutionExpr("No valid solution found");
    }
  };

  /* -------------------
     UI helpers
     ------------------- */
  const isHost = gameState?.turnOrder?.[0] === nickname;

  const endGameForAll = () => {
    if (resultPopup === "gameover") return;
    try { playSound("click"); } catch {}
    stopTimer();
    setRunning(false);
    setResultPopup("gameover");
    if (socket && socket.connected) {
      socket.emit("endGame", { mode, by: nickname, reason: "endedByPlayer" });
    }
  };

  const leaveGame = () => {
    try { playSound("click"); } catch {}
    stopTimer();
    setRunning(false);
    setResultPopup("gameover");
    if (socket && socket.connected) {
      socket.emit("playerLeftGame", { nickname, mode });
    }
  };

  /* ---------- Animations & theme ---------- */
  const fade = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } };
  const currentTheme = themes[theme] || themes.galaxyBlue;

  /* -------------------
     RENDER
     ------------------- */
  return (
    <motion.div
      key={theme}
      className="container"
      data-theme={theme}
      style={{ background: currentTheme.background, color: currentTheme.text }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* TOP CONTROLS */}
      <div className="top-controls">
        <div className="lang-dropdown">
          <button className="control-btn" onClick={() => setDropdownOpen(dropdownOpen === "lang" ? null : "lang")}>
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

        <div className="theme-dropdown">
          <button className="control-btn" onClick={() => setDropdownOpen(dropdownOpen === "theme" ? null : "theme")}>
            <FaPalette />
          </button>
          {dropdownOpen === "theme" && (
            <div className="dropdown-menu">
              {Object.entries(themes).map(([key, val]) => (
                <div key={key} className={`dropdown-item ${theme === key ? "active" : ""}`} onClick={() => { setTheme(key); setDropdownOpen(null); }}>
                  {val.name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="volume-dropdown">
          <button className="control-btn" onClick={() => setDropdownOpen(dropdownOpen === "volume" ? null : "volume")}>
            <FaVolumeUp />
          </button>
          {dropdownOpen === "volume" && (
            <div className="dropdown-menu volume-menu">
              <div className="volume-control">
                <FaVolumeUp className="volume-icon" onClick={toggleMute} style={{ cursor: "pointer" }} />
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

      {/* Back Button */}
      {page !== "login" && (
        <button
          className="back-btn"
          onClick={() => {
            playSound("click");
            if (page === "game") {
              // gracefully leave the match view
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
              setRunning(false);
              setBaseTime(null);
              const activeMode = gameState?.mode || mode;
              socket.emit("playerLeftGame", { nickname, mode: activeMode });
              socket.off("gameStart");
              socket.off("yourTurn");
              socket.off("turnSwitch");
              socket.off("newRound");
              socket.off("syncTimer");
              socket.off("answerResult");
              setIsMyTurn(false);
              setExpression("");
              setTarget(null);
              setDigits([]);
              setOperators(["+", "-", "×", "÷", "(", ")", "√"]);
              setDisabledOps([]);
              setResultPopup(null);
              setSolution(null);
              setPage("mode");
              socket.emit("getPersonalBest", { nickname });
            } else if (page === "waiting" || page === "mode") {
              socket.emit("leaveLobby", nickname);
              // leave but stay online
              setPage("login");
            } else {
              setPage("login");
            }
          }}
        >
          <FaArrowLeft />
        </button>
      )}

      {/* PAGE SWITCHER */}
      <AnimatePresence mode="wait">
        {page === "login" && (
          <motion.div key="login" className="login-page" {...fade}>
            <div className="glass-card">
              <h1 className="title">{T.title}</h1>
              <p className="subtitle">{T.subtitle}</p>
              <input type="text" placeholder={T.enterName} value={nickname} onChange={(e) => setNickname(e.target.value)} />
              <button
                className="main-btn"
                onClick={() => {
                  if (nickname.trim()) {
                    playSound("click");
                    socket.emit("setNickname", nickname);
                    setPage("mode");
                  }
                }}
              >
                {T.start} <FaArrowRight />
              </button>
            </div>
          </motion.div>
        )}

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
                      {p === nickname ? <span className="you-label">{lang === "th" ? "คุณ" : lang === "zh" ? "你" : "You"}</span> : p}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="online-empty">{lang === "th" ? "ไม่มีผู้เล่นออนไลน์" : lang === "zh" ? "暂无在线玩家" : "No players online"}</p>
              )}
            </div>

            <h1 className="select-mode-title">{T.selectMode}</h1>

            <div className="mode-buttons">
              <button
                className="mode-btn glass-btn"
                onClick={() => {
                  playSound("click");
                  setMode("easy");
                  socket.emit("joinGame", { nickname, mode: "easy" });
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
                  socket.emit("joinGame", { nickname, mode: "hard" });
                  setPage("waiting");
                }}
              >
                {T.hard}
              </button>
            </div>

            <div className="personal-best">🏆 Personal Best: {personalBest}</div>
          </motion.div>
        )}

        {page === "waiting" && (
          <motion.div key="waiting" className="waiting-page" {...fade}>
            <h1 className="waiting-title">
              {waitingPlayers.length > 1 ? (lang === "th" ? "พร้อมเริ่มเกม!" : lang === "zh" ? "准备开始游戏！" : "Ready to Start!") : lang === "th" ? "⏳ รอผู้เล่น..." : lang === "zh" ? "⏳ 等待玩家..." : "⏳ Waiting for players..."}
            </h1>

            <h2>{lang === "th" ? "โหมด" : lang === "zh" ? "模式" : "Mode"}: <span className="highlight">{mode === "easy" ? T.easy : T.hard}</span></h2>

            <div className="waiting-box glass-card">
              {waitingPlayers.length > 0 ? <ul>{waitingPlayers.map((p, i) => <li key={i}>{p}</li>)}</ul> : <p>{lang === "th" ? "ยังไม่มีผู้เล่นในห้องนี้" : lang === "zh" ? "该房间暂无玩家" : "No players yet"}</p>}
            </div>

            {waitingPlayers.length > 1 && (
              <button className="main-btn" onClick={() => socket.emit("startGame", { mode, nickname })}>
                🚀 {lang === "th" ? "เริ่มเกม" : lang === "zh" ? "开始游戏" : "Start Game"}
              </button>
            )}

            <button
              className="secondary-btn"
              onClick={() => {
                playSound("click");
                socket.emit("leaveGame", { nickname, mode });
                setPage("mode");
              }}
            >
              ← {lang === "th" ? "ออกจากห้อง" : lang === "zh" ? "离开房间" : "Leave Room"}
            </button>
          </motion.div>
        )}

        {/* pre-game popup */}
        {preGameInfo && countdown > 0 && (
          <motion.div key="preGame" className="popup countdown-popup" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 120 }}>
            <h2>{lang === "th" ? `${preGameInfo.starter} เริ่มเกม!` : lang === "zh" ? `${preGameInfo.starter} 开始了游戏！` : `${preGameInfo.starter} started the game!`}</h2>
            <h1 className="countdown-number">{countdown}</h1>
          </motion.div>
        )}

        {/* GAME PAGE */}
        {page === "game" && (
          <motion.div key="game" className="game-page" {...fade}>
            <div className="game-header">
              <h2 className="big-player">
                {T.playerName}: <span>{nickname}</span>
              </h2>

              <div style={{ position: "fixed", left: "50%", bottom: 16, transform: "translateX(-50%)", display: "flex", gap: 12, justifyContent: "center", alignItems: "center", flexWrap: "wrap", zIndex: 20, padding: "8px 12px", borderRadius: 12, backdropFilter: "blur(6px)" }}>
                <button className="glass-btn" onClick={leaveGame}>
                  <FaSignOutAlt /> {lang === "th" ? "จบเกม" : lang === "zh" ? "结束游戏" : "End Game"}
                </button>
                {isHost && (
                  <button className="glass-btn" style={{ borderColor: "rgba(255,100,100,0.6)" }} onClick={endGameForAll}>
                    🛑 {lang === "th" ? "จบเกม" : lang === "zh" ? "结束游戏" : "End Game"}
                  </button>
                )}
              </div>

              {isMyTurn ? (
                <>
                  <h3 className="turn-status">🎯 It's your turn!</h3>
                  <div className="game-stats">
                    <p className="round-display">Round: <span className="highlight">{rounds}</span></p>
                    <h1 className="target-title">{T.target}: <span className="highlight">{target}</span></h1>
                    <p className={timeLeft <= 10 ? "time-score time-low" : "time-score"}>{T.timeLeft}: {timeLeft}s</p>
                    <p>{T.score}: {score}</p>
                  </div>
                </>
              ) : (
                <div className="waiting-header">
                  <h3 className="turn-status">⏳ Waiting for <span className="highlight">{gameState?.currentTurn}</span>...</h3>
                  <h1 className={`waiting-time ${timeLeft <= 10 ? "time-critical" : ""}`}>{timeLeft > 0 ? `${timeLeft}s` : "00s"}</h1>
                </div>
              )}
            </div>

            {/* body */}
            {!isMyTurn ? (
              <div className="waiting-turn glass-card">
                <h2 className="waiting-title">⏳ Waiting for <span className="highlight">{gameState?.currentTurn}</span>...</h2>
                <div className="waiting-timer"><h1 className={`time-left ${timeLeft <= 10 ? "time-critical" : ""}`}>{timeLeft > 0 ? `${timeLeft}s` : "00s"}</h1></div>
                <p className="hint-text">Please wait until it's your turn to play.</p>
                <div className="reactions">
                  <button onClick={() => socket.emit("reaction", { mode, emoji: "👏", nickname })}>👏</button>
                  <button onClick={() => socket.emit("reaction", { mode, emoji: "😮", nickname })}>😮</button>
                  <button onClick={() => socket.emit("reaction", { mode, emoji: "😭", nickname })}>😭</button>
                  <button onClick={() => socket.emit("reaction", { mode, emoji: "🔥", nickname })}>🔥</button>
                </div>
              </div>
            ) : (
              <>
                {/* digits */}
                <div className="digits-grid">
                  {digits.map((n) => {
                    const used = expression.includes(String(n));
                    return (
                      <button key={n} disabled={lastWasNumber || used} className={`digit-btn ${used ? "used" : ""}`} onClick={() => { playSound("click"); if (!used && !lastWasNumber) { setExpression((p) => p + n); setLastWasNumber(true); } }}>
                        {n}
                      </button>
                    );
                  })}
                </div>

                {/* operators */}
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
                      <button key={op} disabled={isDisabled} className={className} onClick={() => {
                        if (isDisabled) return;
                        playSound("click");
                        setExpression((prev) => prev + op);
                        if (["+", "-", "×", "÷", "(", "√"].includes(op)) setLastWasNumber(false);
                        else if (op === ")") setLastWasNumber(true);
                      }}>
                        {op}
                      </button>
                    );
                  })}
                </div>

                {/* expression */}
                <input className="expression-box" readOnly value={expression} placeholder={T.buildEq} />

                <div className="action-row">
                  <button className="equal-btn glass-btn" onClick={() => { playSound("click"); setExpression(() => ""); setLastWasNumber(false); setLastWasSqrt(false); }}>
                    {T.delete}
                  </button>
                  <button className="equal-btn glass-btn" onClick={() => { playSound("click"); checkAnswer(); }} disabled={digits.some((d) => !expression.includes(String(d)))}>
                    {T.submit}
                  </button>
                </div>

                <div className="reactions">
                  <button onClick={() => socket.emit("reaction", { mode, emoji: "👏", nickname })}>👏</button>
                  <button onClick={() => socket.emit("reaction", { mode, emoji: "😮", nickname })}>😮</button>
                  <button onClick={() => socket.emit("reaction", { mode, emoji: "😭", nickname })}>😭</button>
                  <button onClick={() => socket.emit("reaction", { mode, emoji: "🔥", nickname })}>🔥</button>
                </div>
              </>
            )}

            {/* popups */}
            {resultPopup && resultPopup !== "endRound" && (
              <motion.div className={`popup ${resultPopup === "invalid" ? "invalid" : ""}`} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 120 }}>
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
                      💡 {T.solution}: <br />
                      <span className="solution-highlight">{solutionExpr}</span>
                    </p>
                  </>
                )}
                {resultPopup === "invalid" && <h2>{T.invalidExpr}</h2>}
                {resultPopup === "gameover" && (
                  <>
                    <h2>💀 Game Over</h2>
                    {endByName && <p className="solution-text">🛑 {lang === "th" ? "จบเกมโดย" : lang === "zh" ? "由以下玩家结束：" : "Ended by"}: <span className="solution-highlight"> {endByName}</span></p>}
                    <p className="solution-text">Not enough players to continue.</p>
                  </>
                )}

                {autoResumeCount !== null && <p className="resume-count">Resuming next turn in <span className="highlight">{autoResumeCount}</span>s...</p>}

                {autoResumeCount === null && (
                  <div className="popup-btns">
                    <button onClick={() => { playSound("click"); startGame(mode); }}><FaRedo /> {T.playAgain}</button>
                    <button onClick={() => { playSound("click"); stopTimer(); setPage("stats"); }}><FaSignOutAlt /> {T.exit}</button>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* endRound popup */}
        {resultPopup === "endRound" && (
          <motion.div className="popup" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 120 }}>
            <h2>🏁 End of Round {rounds}</h2>
            <p className="solution-text">{lang === "th" ? "รอบนี้จบแล้ว! พร้อมเริ่มรอบถัดไปหรือไม่?" : "Round complete! Ready for the next one?"}</p>
            <div className="popup-btns">
              <button onClick={() => { playSound("click"); socket.emit("resumeGame", { mode }); setResultPopup(null); }}><FaRedo /> {T.playAgain}</button>
              <button onClick={() => { playSound("click"); socket.emit("playerLeftGame", { nickname, mode }); setPage("login"); }}><FaSignOutAlt /> {T.exit}</button>
            </div>
          </motion.div>
        )}

        {/* stats page */}
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
                  return <p style={{ textAlign: "center", marginTop: 12 }}>{lang === "th" ? "ยังไม่มีผู้เล่น" : lang === "zh" ? "暂无玩家" : "No players yet"}</p>;
                }
                const sorted = [...rowsRaw].sort((a, b) => b[1] - a[1]);
                const [winName, winScore] = sorted[0];
                return (
                  <>
                    <div className="winner-banner" style={{ margin: "8px 0 16px", textAlign: "center" }}>
                      <h3 style={{ margin: 0 }}>🏆 {lang === "th" ? "ผู้ชนะ" : lang === "zh" ? "获胜者" : "Winner"}: <span className="highlight">{winName}</span></h3>
                      <p style={{ marginTop: 6 }}>{lang === "th" ? "คะแนน" : lang === "zh" ? "分数" : "Score"}: <strong>{winScore}</strong></p>
                    </div>

                    <div className="scoreboard glass-card" style={{ padding: 16 }}>
                      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px" }}>
                        <thead>
                          <tr><th style={{ textAlign: "left" }}>{lang === "th" ? "ผู้เล่น" : lang === "zh" ? "玩家" : "Player"}</th><th style={{ textAlign: "right" }}>{lang === "th" ? "คะแนน" : lang === "zh" ? "分数" : "Score"}</th></tr>
                        </thead>
                        <tbody>
                          {sorted.map(([name, sc]) => (
                            <tr key={name}>
                              <td>{name === nickname ? <span className="you-label" style={{ marginRight: 6 }}>{lang === "th" ? "คุณ" : lang === "zh" ? "你" : "You"}</span> : null}{name}{name === winName && <span style={{ marginLeft: 8 }}>🏆</span>}</td>
                              <td style={{ textAlign: "right" }}><strong>{sc}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}

              <div className="stats-actions" style={{ marginTop: 16 }}>
                <button className="main-btn" onClick={() => { playSound("click"); setPage("mode"); }}><FaArrowLeft /> {T.back}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {reactionPopup && <div className="reaction-popup">{reactionPopup}</div>}
    </motion.div>
  );
}
