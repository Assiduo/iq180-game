// src/App.jsx
/* =============================================================
 🧩 IQ180 React App (Blended & Patched)
 - Single-file client with robust timer sync, submit lock,
   safe socket listener lifecycle, and consistent game logic.
=============================================================*/

import React, { useEffect, useRef, useState } from "react";
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
  FaTrophy,
} from "react-icons/fa";
import "./App.css";

import clickSoundFile from "./sounds/click.mp3";
import correctSoundFile from "./sounds/correct.mp3";
import wrongSoundFile from "./sounds/wrong.mp3";
import timeoutSoundFile from "./sounds/timeout.mp3";
import bgmFile from "./sounds/bgm.mp3";

import { io } from "socket.io-client";

/* ====== CONFIG ====== */
// Replace with your server IP if needed:
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://10.203.146.192:4000";
const socket = io(SERVER_URL, { autoConnect: true, transports: ["websocket", "polling"] });


/* ====== Helpers: generate / solve ====== */
const generateProblemLocal = (m = "easy") => {
  const nums = [];
  while (nums.length < 5) nums.push(Math.floor(Math.random() * 9) + 1);
  const ops = ["+", "-", "×", "÷"];
  const expr = `${nums[0]}+${nums[1]}+${nums[2]}+${nums[3]}+${nums[4]}`;
  // eslint-disable-next-line no-eval
  const targetVal = Math.round(eval(expr));
  return { digits: nums, operators: ops, disabledOps: [], target: targetVal, mode: m };
};

// brute force finder (returns expression using × and ÷)
const findSolutionBrute = (digitsArr = [], tgt = 0, disabled = []) => {
  if (!Array.isArray(digitsArr) || digitsArr.length === 0) return null;
  const ops = ["+", "-", "*", "/"];
  const permute = (arr) => {
    if (arr.length <= 1) return [arr];
    const res = [];
    arr.forEach((v, i) => {
      const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
      permute(rest).forEach((p) => res.push([v, ...p]));
    });
    return res;
  };
  const numPerms = permute(digitsArr);
  for (const nums of numPerms) {
    for (let o1 of ops) for (let o2 of ops) for (let o3 of ops) for (let o4 of ops) {
      const expr = `${nums[0]}${o1}${nums[1]}${o2}${nums[2]}${o3}${nums[3]}${o4}${nums[4]}`;
      try {
        // eslint-disable-next-line no-eval
        const val = eval(expr);
        if (Number.isFinite(val) && Math.abs(val - tgt) < 1e-9) {
          return expr.replace(/\*/g, "×").replace(/\//g, "÷");
        }
      } catch {}
    }
  }
  return null;
};

/* ====== Component ====== */
export default function App() {
  /* ---------------- UI / i18n / theme ---------------- */
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
      welcome: "Welcome"
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
      welcome: "ยินดีต้อนรับ"
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
      exit: "退出",
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
      welcome: "欢迎"
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

  /* ---------------- Sounds (stable refs) ---------------- */
  const clickRef = useRef(null);
  const correctRef = useRef(null);
  const wrongRef = useRef(null);
  const timeoutRef = useRef(null);
  const bgmRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.4);

  useEffect(() => {
    clickRef.current = new Howl({ src: [clickSoundFile], volume: 0.6 });
    correctRef.current = new Howl({ src: [correctSoundFile], volume: 0.7 });
    wrongRef.current = new Howl({ src: [wrongSoundFile], volume: 0.7 });
    timeoutRef.current = new Howl({ src: [timeoutSoundFile], volume: 0.6 });
    bgmRef.current = new Howl({ src: [bgmFile], loop: true, volume });

    if (!muted) {
      try { bgmRef.current.play(); } catch (e) {}
    }
    return () => { bgmRef.current?.stop(); };
    // run once
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!bgmRef.current) return;
    bgmRef.current.volume(volume);
    if (muted) bgmRef.current.pause();
    else if (!bgmRef.current.playing()) bgmRef.current.play();
  }, [volume, muted]);

  // const playSound = (type) => {
  //   if (muted) return;
  //   if (type === "click") clickRef.current?.play();
  //   if (type === "correct") correctRef.current?.play();
  //   if (type === "wrong") wrongRef.current?.play();
  //   if (type === "timeout") timeoutRef.current?.play();
  // };

  // const playSoundInternal = (t) => { try { playSound(t); } catch (e) {} };

  /* ---------------- App state ---------------- */
  const [page, setPage] = useState("login");
  const [nickname, setNickname] = useState("");
  const [mode, setMode] = useState("easy");
  const [score, setScore] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [hasConfirmedName, setHasConfirmedName] = useState(false);

  const [showDemo, setShowDemo] = useState(false);
  const [demoExpression, setDemoExpression] = useState("");
  const [demoResult, setDemoResult] = useState(null);
  const [demoUsedNums, setDemoUsedNums] = useState([false, false, false]);


  const [digits, setDigits] = useState([]);
  const [operators, setOperators] = useState(["+", "-", "×", "÷", "(", ")", "√"]);
  const [disabledOps, setDisabledOps] = useState([]);
  const [target, setTarget] = useState(0);
  const [expression, setExpression] = useState("");

  const [resultPopup, setResultPopup] = useState(null);
  const [solutionExpr, setSolutionExpr] = useState("");
  const [history, setHistory] = useState([]);
  const [lastWasNumber, setLastWasNumber] = useState(false);

  const [playerList, setPlayerList] = useState([]);
  const [waitingPlayers, setWaitingPlayers] = useState([]);
  const [canStart, setCanStart] = useState(false);
  const [preGameInfo, setPreGameInfo] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [showCountdown, setShowCountdown] = useState(false);

  const [gameState, setGameState] = useState({});
  const [isMyTurn, setIsMyTurn] = useState(false);

  const [autoResumeCount, setAutoResumeCount] = useState(null);

  const [leaderboard, setLeaderboard] = useState([]);
  const [scores, setScores] = useState({});
  const [personalBest, setPersonalBest] = useState(0);
  const [reactionPopup, setReactionPopup] = useState(null);

  /* ---------------- Timer ---------------- */
  const [baseTime, setBaseTime] = useState(null); // ms timestamp from server/host
  const [timeLeft, setTimeLeft] = useState(60);
  const [running, setRunning] = useState(false);
  const timerRef = useRef(null);
  const roundTimeRef = useRef(60);

  const problemRef = useRef({ digits: [], target: 0, disabledOps: [] });
  const submissionLockRef = useRef(false);

  /* ---------------- Socket listeners (single attach) ---------------- */
  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      console.log("socket connected");
      if (nickname && nickname.trim()) socket.emit("setNickname", nickname);
      socket.emit("getLeaderboard");
    };

    const onPlayerList = (list) => setPlayerList(Array.isArray(list) ? list : []);
    const onWaitingList = (d) => { if (!d) return; if (!d.mode || d.mode === mode) setWaitingPlayers(Array.isArray(d.players) ? d.players : []); };
    const onCanStart = (d) => { if (!d) return; if (d.mode === mode) setCanStart(!!d.canStart); };

    const onPreGameStart = (d) => {
      if (!d) return;
      setPreGameInfo({ mode: d.mode, starter: d.starter, players: d.players });
      let counter = d.countdown ?? 3;
      setCountdown(counter);
      setShowCountdown(true);
      const t = setInterval(() => {
        counter -= 1;
        setCountdown(counter);
        if (counter <= 0) { clearInterval(t); setShowCountdown(false); }
      }, 1000);
    };

    const onGameStart = (d) => {
      if (!d) return;
      const rt = d.roundTime ?? (d.mode === "hard" ? 30 : 60);
      roundTimeRef.current = rt;

      setDigits(d.digits || []);
      setOperators(d.operators || ["+", "-", "×", "÷"]);
      setDisabledOps(d.disabledOps || []);
      setTarget(d.target || 0);
      setMode(d.mode || "easy");
      problemRef.current = { digits: d.digits || [], target: d.target || 0, disabledOps: d.disabledOps || [] };

      const listPlayers = Array.isArray(d.players) && d.players.length ? d.players : (Array.isArray(d.turnOrder) ? d.turnOrder : []);
      const uniquePlayers = Array.from(new Set([...listPlayers, nickname].filter(Boolean)));
      setScores(Object.fromEntries(uniquePlayers.map((p) => [p, 0])));

      setGameState({
        turnOrder: d.turnOrder || d.players || [],
        currentTurn: d.currentTurn || null,
        mode: d.mode || mode,
        host: d.host,
      });

      const amTurn = d.currentTurn === nickname;
      setIsMyTurn(amTurn);
      setPage("game");
      setExpression("");
      setLastWasNumber(false);
      setResultPopup(null);
      setSolutionExpr("");
      setScore(0);
      setRounds(d.round ?? 1);

      if (d.startTime) {
        setBaseTime(d.startTime);
        setRunning(true);
        const elapsed = Math.floor((Date.now() - d.startTime) / 1000);
        setTimeLeft(Math.max(rt - elapsed, 0));
      } else if (amTurn) {
        const now = Date.now();
        setBaseTime(now);
        setRunning(true);
        setTimeLeft(rt);
        if (d.host === nickname) {
          socket.emit("syncTimer", { startTime: now, roundTime: rt, mode: d.mode });
        }
      } else {
        setRunning(false);
        setBaseTime(null);
        setTimeLeft(rt);
      }
    };

    const onNewRound = (d) => {
      if (!d) return;
      const rt = d.roundTime ?? roundTimeRef.current;
      roundTimeRef.current = rt;

      setDigits(d.digits || []);
      setOperators(d.operators || ["+", "-", "×", "÷"]);
      setDisabledOps(d.disabledOps || []);
      setTarget(d.target || 0);
      if (d.round !== undefined) setRounds(d.round);
      setExpression("");
      problemRef.current = { digits: d.digits || [], target: d.target || 0, disabledOps: d.disabledOps || [] };
      setSolutionExpr("");
      setResultPopup(null);

      if (d.startTime) {
        setBaseTime(d.startTime);
        setRunning(true);
        const elapsed = Math.floor((Date.now() - d.startTime) / 1000);
        setTimeLeft(Math.max(rt - elapsed, 0));
      } else {
        setRunning(false);
        setBaseTime(null);
        setTimeLeft(rt);
      }
    };

    const onTurnSwitch = (d) => {
      if (!d) return;
      setGameState((prev) => ({ ...(prev || {}), currentTurn: d.nextTurn }));
      if (d.round !== undefined) setRounds(d.round);
      setIsMyTurn(d.nextTurn === nickname);

      if (d.startTime) {
        roundTimeRef.current = d.roundTime ?? roundTimeRef.current;
        setBaseTime(d.startTime);
        setRunning(true);
        const elapsed = Math.floor((Date.now() - d.startTime) / 1000);
        setTimeLeft(Math.max(roundTimeRef.current - elapsed, 0));
      } else {
        // keep clients paused until sync or until their turn
        setRunning(false);
        setBaseTime(null);
        // If it's us, start our local timer and ask for authoritative sync
        if (d.nextTurn === nickname) {
          const now = Date.now();
          roundTimeRef.current = roundTimeRef.current ?? (mode === "hard" ? 30 : 60);
          setBaseTime(now);
          setRunning(true);
          setTimeLeft(roundTimeRef.current);
          socket.emit("requestSync", { mode });
        }
      }
    };

    const onSyncTimer = ({ startTime, roundTime }) => {
      if (!startTime) return;
      roundTimeRef.current = roundTime ?? roundTimeRef.current ?? (mode === "hard" ? 30 : 60);
      setBaseTime(startTime);
      setRunning(true);
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setTimeLeft(Math.max(roundTimeRef.current - elapsed, 0));
    };

    const onYourTurn = ({ mode: myMode, startTime, roundTime }) => {
      setIsMyTurn(true);
      if (myMode) setMode(myMode);
      roundTimeRef.current = roundTime ?? roundTimeRef.current ?? (myMode === "hard" ? 30 : 60);

      // Use server-provided problem if it exists; otherwise generate local
      if (!problemRef.current?.digits?.length) {
        const g = generateProblemLocal(myMode);
        setDigits(g.digits);
        setDisabledOps(g.disabledOps);
        setTarget(g.target);
        problemRef.current = { digits: g.digits, target: g.target, disabledOps: g.disabledOps };
      }

      if (startTime) {
        setBaseTime(startTime);
        setRunning(true);
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setTimeLeft(Math.max(roundTimeRef.current - elapsed, 0));
      } else {
        const now = Date.now();
        setBaseTime(now);
        setRunning(true);
        setTimeLeft(roundTimeRef.current);
        if ((gameState?.host || "") === nickname) {
          socket.emit("syncTimer", { startTime: now, roundTime: roundTimeRef.current, mode: myMode });
        }
      }

      setExpression("");
      setLastWasNumber(false);
      setResultPopup(null);
    };

    const onAnswerResult = (d) => {
      if (!d) return;
      setScores((prev) => ({ ...(prev || {}), [d.nickname]: (prev?.[d.nickname] || 0) + (d.correct ? 1 : 0) }));
      if (d.round !== undefined) setRounds(d.round);
    };

    const onGameOver = (d) => {
      setResultPopup("gameover");
      stopTimer();
      setRunning(false);
    };

    const onPlayerLeft = (d) => {
      if (!d) return;
      if (d.mode === mode) setWaitingPlayers((p) => p.filter((n) => n !== d.nickname));
    };

    const onReaction = (d) => {
      setReactionPopup(`${d.from}: ${d.emoji}`);
      setTimeout(() => setReactionPopup(null), 2000);
    };

    const onPersonalBest = (d) => { if (d?.best !== undefined) setPersonalBest(d.best); };
    const onLeaderboardUpdate = (d) => setLeaderboard(d || []);

    // attach
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
    socket.on("leaderboardUpdate", onLeaderboardUpdate);

    if (!socket.connected) socket.connect();

    // cleanup all attached in this effect
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
      socket.off("leaderboardUpdate", onLeaderboardUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // attach once

  /* ---------------- Host-synced ticker (runs when running/baseTime present) ---------------- */
  useEffect(() => {
    if (!running || baseTime == null) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    const tick = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - baseTime) / 1000);
      const roundTime = roundTimeRef.current ?? (mode === "hard" ? 30 : 60);
      const remaining = Math.max(roundTime - elapsed, 0);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        setRunning(false);
        playSound("timeout");
        setResultPopup("timeout");
        try {
          const sol = findSolutionBrute(problemRef.current.digits || [], problemRef.current.target || 0, problemRef.current.disabledOps || []);
          setSolutionExpr(sol || "No valid solution found");
        } catch {
          setSolutionExpr("No valid solution found");
        }

        // inform server
        socket.emit("answerResult", {
          nickname,
          result: "timeout",
          correct: false,
          score,
          round: rounds + 1,
          mode,
          clientTime: Date.now(),
        });

        // auto resume countdown
        let count = 3;
        setAutoResumeCount(count);
        const cInt = setInterval(() => {
          count -= 1;
          setAutoResumeCount(count);
          if (count <= 0) {
            clearInterval(cInt);
            setAutoResumeCount(null);
            setResultPopup(null);
            socket.emit("resumeGame", { mode });
            setIsMyTurn(false);
          }
        }, 1000);
      }
    };

    tick();
    timerRef.current = setInterval(tick, 1000);

    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [running, baseTime, mode, rounds, score]);

  /* ---------------- Actions ---------------- */
  const startGame = (playMode = mode) => {
    socket.emit("startGame", { mode: playMode, nickname });
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRunning(false);
    setBaseTime(null);
  };

  const checkAnswer = async () => {
    if (submissionLockRef.current) return;
    submissionLockRef.current = true;

    try {
      const expr = expression.trim();
      if (!/\d/.test(expr)) { setResultPopup("invalid"); return; }
      if (/^[+\-×÷*/)]/.test(expr)) { setResultPopup("invalid"); return; }
      if (/[+\-×÷*/(]$/.test(expr)) { setResultPopup("invalid"); return; }

      const clean = expr.replace(/×/g, "*").replace(/÷/g, "/").replace(/\^/g, "**").replace(/√(\d+|\([^()]+\))/g, "Math.sqrt($1)");
      // eslint-disable-next-line no-eval
      const result = eval(clean);
      const correct = Number.isFinite(result) && Math.abs(result - target) < 1e-9;

      // stop current timer to avoid duplicates
      stopTimer();

      if (correct) {
        playSound("correct");
        setScore((s) => s + 1);
        setResultPopup("correct");
        setSolutionExpr("");
      } else {
        playSound("wrong");
        setResultPopup("wrong");
        try {
          const sol = findSolutionBrute(digits, target, disabledOps);
          setSolutionExpr(sol || "No valid solution found");
        } catch {
          setSolutionExpr("No valid solution found");
        }
      }

      setHistory((h) => [...h, { round: rounds + 1, result: correct ? target : result, ok: correct }]);

      socket.emit("answerResult", {
        nickname,
        mode,
        result: correct ? target : result,
        correct,
        score: correct ? score + 1 : score,
        round: rounds + 1,
        clientTime: Date.now(),
      });

      let count = 3;
      setAutoResumeCount(count);
      const t = setInterval(() => {
        count -= 1;
        setAutoResumeCount(count);
        if (count <= 0) {
          clearInterval(t);
          setAutoResumeCount(null);
          setResultPopup(null);
          if (isMyTurn) {
            socket.emit("resumeGame", { mode });
            setIsMyTurn(false);
          }
        }
      }, 1000);
    } catch (err) {
      console.error("checkAnswer error", err);
      setResultPopup("invalid");
      setSolutionExpr("No valid solution found");
    } finally {
      // small debounce before allowing next submit
      setTimeout(() => { submissionLockRef.current = false; }, 1200);
    }
  };

  const leaveGame = () => {
    stopTimer();
    setRunning(false);
    setResultPopup("gameover");
    if (socket && socket.connected) socket.emit("playerLeftGame", { nickname, mode });
    setPage("mode");
  };

  const endGameForAll = () => {
    if (resultPopup === "gameover") return;
    playSoundInternal("click");
    stopTimer();
    setRunning(false);
    setResultPopup("gameover");
    if (socket && socket.connected) socket.emit("endGame", { mode, by: nickname, reason: "endedByPlayer" });
  };

  // /* ---------- Small UI helpers ---------- */
  function playSound(type) { try { playSoundInternal(type); } catch { } }
  function playSoundInternal(type) {
    if (muted) return;
    if (type === "click") clickRef.current?.play();
    if (type === "correct") correctRef.current?.play();
    if (type === "wrong") wrongRef.current?.play();
    if (type === "timeout") timeoutRef.current?.play();
  }

  /* ---------- Render (kept structure similar to original) ---------- */
  const fade = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } };
  const currentTheme = themes[theme] || themes.galaxyBlue;
  const isHost = (gameState?.host === nickname) || (Array.isArray(gameState?.turnOrder) && gameState.turnOrder[0] === nickname);

  /* ---------------- Render (UI) ---------------- */
  return (
    <motion.div className="container" style={{ background: currentTheme.background, color: currentTheme.text, minHeight: "100vh" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
      {/* Top controls */}
      <div className="top-controls">
        <div className="lang-dropdown">
          <button className="control-btn" onClick={() => setDropdownOpen(dropdownOpen === "lang" ? null : "lang")}><FaGlobe /></button>
          {dropdownOpen === "lang" && (<div className="dropdown-menu">{Object.keys(texts).map((c) => <div key={c} className={`dropdown-item ${lang === c ? "active" : ""}`} onClick={() => { setLang(c); setDropdownOpen(null); }}>{c.toUpperCase()}</div>)}</div>)}
        </div>

        <div className="theme-dropdown">
          <button className="control-btn" onClick={() => setDropdownOpen(dropdownOpen === "theme" ? null : "theme")}><FaPalette /></button>
          {dropdownOpen === "theme" && (<div className="dropdown-menu">{Object.entries(themes).map(([k, v]) => <div key={k} className={`dropdown-item ${theme === k ? "active" : ""}`} onClick={() => { setTheme(k); setDropdownOpen(null); }}>{v.name}</div>)}</div>)}
        </div>

        <div className="volume-dropdown">
          <button className="control-btn" onClick={() => setDropdownOpen(dropdownOpen === "volume" ? null : "volume")}><FaVolumeUp /></button>
          {dropdownOpen === "volume" && (
            <div className="dropdown-menu volume-menu">
              <div className="volume-control">
                <FaVolumeUp className="volume-icon" onClick={() => { setMuted((m) => !m); }} style={{ cursor: "pointer" }} />
                <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={(e) => { const val = parseFloat(e.target.value); setVolume(val); setMuted(val === 0); }} className="volume-slider" />
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Back button */}
      {page !== "login" && (
        <button className="back-btn" onClick={() => {
          playSoundInternal("click");
          if (page === "game") {
            stopTimer();
            const activeMode = gameState?.mode || mode;
            if (socket && socket.connected) {
              socket.emit("playerLeftGame", { nickname, mode: activeMode });
            }
            setRunning(false);
            setIsMyTurn(false);
            setPage("mode");
          } else if (page === "waiting" || page === "mode") {
            if (socket && socket.connected) socket.emit("leaveLobby", nickname);
            setPage("login");
          } else {
            setPage("login");
          }
        }}>
          <FaArrowLeft />
        </button>
      )}

      <AnimatePresence mode="wait">
        {page === "login" && !showWelcomePopup && (
    <motion.div key="login" className="login-page" {...fade}>
      <div className="glass-card">
        <h1 className="title">{T.title}</h1>
        <p className="subtitle">{T.subtitle}</p>
        <input type="text" placeholder={T.enterName} value={nickname} onChange={e => setNickname(e.target.value)} />
        <button className="main-btn" onClick={() => { if (nickname.trim()) { playSound("click"); socket.emit("setNickname", nickname); setShowWelcomePopup(true);setPage("intro") } }}>
          {T.start} <FaArrowRight />
        </button>
      </div>
    </motion.div>
  )}

  {/* INTRO PAGE (Welcome + How to Play) ------------------------------ */}
{page === "intro" && (
  <motion.div key="intro" className="intro-page" {...fade}>
    <div className="glass-card" style={{ padding: "2.5rem", maxWidth: 900, margin: "2rem auto" }}>
      <h1 style={{ fontSize: "2.2rem", marginBottom: "0.6rem", color: "white" }}>
        {T.welcome},{" "}
        <span style={{ textDecoration: "underline", color: "white" }}>{nickname}</span>!
      </h1>
      <p style={{ marginBottom: "1.2rem", color: "rgba(255,255,255,0.85)" }}>
        {lang === "th"
          ? "ยินดีต้อนรับ! นี่คือวิธีการเล่นและเคล็ดลับก่อนเริ่มเกม"
          : lang === "zh"
          ? "欢迎！以下是开始游戏前的玩法说明与提示"
          : "Welcome! Here’s how to play and a few tips before you start."}
      </p>

      {/* How to Play */}
      <div style={{ background: "rgba(255,255,255,0.03)", padding: "1rem 1.25rem", borderRadius: 14, marginBottom: "1.2rem" }}>
        <h2 style={{ marginBottom: "0.6rem" }}>
          {lang === "th" ? "วิธีการเล่น" : lang === "zh" ? "玩法说明" : "How to Play"}
        </h2>
        <ul style={{ textAlign: "left", lineHeight: 1.8, fontSize: "1rem", color: "rgba(255,255,255,0.9)" }}>
          <li>🎯 {lang === "th" ? "เป้าหมาย: สร้างสมการจากตัวเลขให้ได้ค่าตามเป้าหมาย" : lang === "zh" ? "目标：使用提供的数字构建等式以匹配目标数字" : "Goal: Build an equation from the digits to match the target number."}</li>
          <li>➕➖✖️➗ {lang === "th" ? "เลือกเครื่องหมายและคลิกตัวเลขเพื่อสร้างสมการ" : lang === "zh" ? "选择运算符并点击数字来构建等式" : "Choose operators and click digits to form the equation."}</li>
          <li>⏰ {lang === "th" ? "เวลา: 60 วินาทีต่อเทิร์น (โหมด Genius อาจสั้นลง)" : lang === "zh" ? "时间：每回合 60 秒（天才模式可能更短）" : "Time: 60 seconds per turn (Genius mode may be shorter)."}</li>
          <li>✅❌ {lang === "th" ? "ระบบจะตรวจคำตอบและให้คะแนนอัตโนมัติ" : lang === "zh" ? "系统会自动检查答案并计分" : "The system auto-checks answers and updates score."}</li>
          <li>👥 {lang === "th" ? "โหมดผู้เล่นหลายคน: ระบบจะสลับตาระหว่างผู้เล่น" : lang === "zh" ? "多人模式：系统会自动切换回合" : "Multiplayer: turns automatically switch between players."}</li>
        </ul>
      </div>

      {/* Tips */}
      <div style={{ background: "rgba(255,255,255,0.02)", padding: "0.8rem 1rem", borderRadius: 12, marginBottom: "1rem" }}>
        <h3 style={{ marginBottom: "0.4rem" }}>{lang === "th" ? "เคล็ดลับ" : lang === "zh" ? "提示" : "Tips"}</h3>
        <p style={{ color: "rgba(255,255,255,0.85)" }}>
          {lang === "th"
            ? "ลองเริ่มจากการจับคู่ง่าย ๆ และใช้การจัดลำดับเครื่องหมายเพื่อหลีกเลี่ยงการหารด้วยศูนย์"
            : lang === "zh"
            ? "先从简单组合尝试，注意避免除以 0"
            : "Start with simple combinations; avoid division by zero and try operator order to match target."}
        </p>
      </div>

      {/* Practice Demo Button */}
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <button
          onClick={() => { playSound("click"); setShowDemo(p => !p); setDemoExpression(""); setDemoResult(null); }}
          className="glass-btn"
          style={{ padding: "0.6rem 1rem", borderRadius: "0.8rem", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "white", fontSize: "1rem", cursor: "pointer" }}
        >
          🧮 {showDemo ? (lang === "th" ? "ปิดโหมดฝึกซ้อม" : lang === "zh" ? "关闭练习模式" : "Close Practice Mode") : (lang === "th" ? "เริ่มฝึกซ้อม (Demo)" : lang === "zh" ? "开始练习 (Demo)" : "Start Demo")}
        </button>
      </div>

      {/* Demo Practice Section */}
      {showDemo && (
        <div className="glass-card" style={{ margin: "1.2rem auto", padding: "1.5rem", width: "90%", maxWidth: 500, borderRadius: "1rem", background: "rgba(255,255,255,0.05)" }}>
          <h3 style={{ marginBottom: "0.8rem", fontSize: "1.4rem" }}>
            {lang === "th" ? "ใช้ตัวเลขทั้งสามเพื่อให้ได้ผลลัพธ์ = 17" : lang === "zh" ? "使用这三个数字使结果 = 17" : "Use all three numbers to make result = 17"}
          </h3>

          {/* Numbers */}
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginBottom: "0.8rem" }}>
            {[3, 8, 3].map((num, idx) => (
              <button key={idx}
                onClick={() => { if (demoUsedNums[idx]) return; if (/[+\-×÷]$/.test(demoExpression) || demoExpression === "") { setDemoExpression(p => p + num); const c = [...demoUsedNums]; c[idx] = true; setDemoUsedNums(c); } else playSound("error"); }}
                disabled={demoUsedNums[idx]}
                style={{ padding: "0.6rem 1rem", fontSize: "1.2rem", borderRadius: "0.6rem", background: demoUsedNums[idx] ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)", color: demoUsedNums[idx] ? "gray" : "white", border: "1px solid rgba(255,255,255,0.2)", cursor: demoUsedNums[idx] ? "not-allowed" : "pointer" }}
              >{num}</button>
            ))}
          </div>

          {/* Operators */}
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginBottom: "0.8rem" }}>
            {["+", "-", "×", "÷"].map(op => (
              <button key={op}
                onClick={() => { if (!demoExpression || /[+\-×÷]$/.test(demoExpression)) return playSound("error"); setDemoExpression(p => p + op); }}
                style={{ padding: "0.5rem 0.8rem", fontSize: "1.2rem", borderRadius: "0.6rem", background: "rgba(255,255,255,0.1)", color: "#00bfff", border: "1px solid rgba(255,255,255,0.15)" }}
              >{op}</button>
            ))}
          </div>

          <input value={demoExpression} readOnly placeholder={lang === "th" ? "สร้างสมการที่นี่..." : lang === "zh" ? "在此构建等式..." : "Build your equation here..."} style={{ width: "100%", padding: "0.5rem", fontSize: "1rem", borderRadius: "0.5rem", marginBottom: "0.8rem", textAlign: "center" }} />

          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", marginBottom: "0.5rem" }}>
            <button onClick={() => setDemoExpression(p => p.slice(0, -1))} style={{ padding: "0.5rem 1rem", borderRadius: "0.6rem", background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.2)" }}>{T.delete}</button>
            <button onClick={() => { const used = demoUsedNums.filter(Boolean).length; if (used < 3 || /[+\-×÷]$/.test(demoExpression)) return setDemoResult("❌"), playSound("error"); try { const val = eval(demoExpression.replace(/×/g, "*").replace(/÷/g, "/")); setDemoResult(val); } catch { setDemoResult("❌"); } }} style={{ padding: "0.5rem 1rem", borderRadius: "0.6rem", background: "#00bfff", color: "white", border: "none" }}>{T.submit}</button>
            <button onClick={() => { setDemoExpression(""); setDemoUsedNums([false, false, false]); setDemoResult(null); }} style={{ padding: "0.5rem 1rem", borderRadius: "0.6rem", background: "rgba(255,255,255,0.05)", color: "white", border: "1px solid rgba(255,255,255,0.15)" }}>🔄 {lang === "th" ? "รีเซ็ต" : lang === "zh" ? "重置" : "Reset"}</button>
          </div>

          {demoResult !== null && (
            <p style={{ marginTop: "1rem", fontSize: "1.2rem" }}>
              {lang === "th" ? "ผลลัพธ์:" : lang === "zh" ? "结果:" : "Result:"}{" "}
              <span style={{ color: demoResult === 17 ? "#00ff88" : demoResult === "❌" ? "#ff4444" : "white", fontWeight: "bold" }}>{demoResult}</span>
              {demoResult === 17 && <span style={{ marginLeft: "0.4rem" }}>✅</span>}
            </p>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 10 }}>
        <button className="secondary-btn" onClick={() => { playSound("click"); setPage("login"); }}>← {T.back}</button>
        <button className="secondary-btn" onClick={() => { playSound("click"); setPage("mode"); }}>
          {lang === "th" ? "ไปเลือกโหมด" : lang === "zh" ? "进入模式选择" : "Continue to Game Mode"} <FaArrowRight />
        </button>
      </div>
    </div>
  </motion.div>
)}


  {page === "mode" && (
    <motion.div key="mode" className="mode-page" {...fade}>
      <h2 className="big-player">{T.playerName}: <span>{nickname}</span></h2>
      <div className="online-box glass-card">
        <h3 className="online-title">👥 {lang === "th" ? "ผู้เล่นที่ออนไลน์" : lang === "zh" ? "在线玩家" : "Players Online"}</h3>
        {playerList && playerList.length > 0 ? (
          <ul className="online-list">
            {playerList.map((p, i) => p === nickname ? <li key={i} className="self"><span className="you-label">{lang === "th" ? "คุณ" : lang === "zh" ? "你" : "You"}</span></li> : <li key={i}>{p}</li>)}
          </ul>
        ) : <p className="online-empty">{lang === "th"? "ไม่มีผู้เล่นออนไลน์": lang === "zh"? "暂无在线玩家": "No players online"}</p>}
      </div>
      <h1 className="select-mode-title">{T.selectMode}</h1>
      <div className="mode-buttons">
        <button className="mode-btn glass-btn" onClick={() => { playSoundInternal("click"); setMode("easy"); socket.emit("joinGame", { nickname, mode: "easy" }); setPage("waiting"); }}>{T.easy}</button>
        <button className="mode-btn glass-btn" onClick={() => { playSoundInternal("click"); setMode("hard"); socket.emit("joinGame", { nickname, mode: "hard" }); setPage("waiting"); }}>{T.hard}</button>
      </div>
      <div className="personal-best">🏆 Personal Best: {personalBest}</div>
    </motion.div>
  )}

        {page === "waiting" && (
          <motion.div key="waiting" className="waiting-page" {...fade}>
            <h1 className="waiting-title">{waitingPlayers.length > 1 ? (lang === "th" ? "พร้อมเริ่มเกม!" : lang === "zh" ? "准备开始游戏！" : "Ready to Start!") : (lang === "th" ? "⏳ รอผู้เล่น..." : lang === "zh" ? "⏳ 等待玩家..." : "⏳ Waiting for players...")}</h1>
            <h2>{lang === "th" ? "โหมด" : lang === "zh" ? "模式" : "Mode"}: <span className="highlight">{mode === "easy" ? T.easy : T.hard}</span></h2>
            <div className="waiting-box glass-card">{waitingPlayers.length > 0 ? <ul>{waitingPlayers.map((p, i) => <li key={i}>{p}</li>)}</ul> : <p>{lang === "th" ? "ยังไม่มีผู้เล่นในห้องนี้" : lang === "zh" ? "该房间暂无玩家" : "No players yet"}</p>}</div>

            {waitingPlayers.length > 1 && <button className="main-btn" onClick={() => socket.emit("startGame", { mode, nickname })}>🚀 {lang === "th" ? "เริ่มเกม" : lang === "zh" ? "开始游戏" : "Start Game"}</button>}

            <button className="secondary-btn" onClick={() => { playSoundInternal("click"); socket.emit("leaveGame", { nickname, mode }); setPage("mode"); }}>← {lang === "th" ? "ออกจากห้อง" : lang === "zh" ? "离开房间" : "Leave Room"}</button>
          </motion.div>
        )}

        {preGameInfo && showCountdown && (
          <motion.div key="preGame" className="popup countdown-popup" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 120 }}>
            <h2>{lang === "th" ? `${preGameInfo.starter} เริ่มเกม!` : lang === "zh" ? `${preGameInfo.starter} 开始了游戏！` : `${preGameInfo.starter} started the game!`}</h2>
            <h1 className="countdown-number">{countdown}</h1>
          </motion.div>
        )}

        {page === "game" && (
          <motion.div key="game" className="game-page" {...fade}>
            <div className="game-header">
              <h2 className="big-player">{T.playerName}: <span>{nickname}</span></h2>

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
                  <h3 className="turn-status">⏳ Waiting for <span className="highlight">{gameState?.currentTurn ?? "player"}</span>...</h3>
                  <h1 className={`waiting-time ${timeLeft <= 10 ? "time-critical" : ""}`}>{timeLeft > 0 ? `${timeLeft}s` : "00s"}</h1>
                </div>
              )}
            </div>

            <div className="content">
              {!isMyTurn ? (
                <div className="waiting-turn glass-card">
                  <h2 className="waiting-title">⏳ Waiting...</h2>
                  <div className="waiting-timer"><h1 className={`time-left ${timeLeft <= 10 ? "time-critical" : ""}`}>{timeLeft > 0 ? `${timeLeft}s` : "00s"}</h1></div>
                  <p className="hint-text">Please wait until it's your turn.</p>
                </div>
              ) : (
                <>
                  <div className="digits-grid">{digits.map((n) => {
                    const used = expression.includes(String(n));
                    return <button key={n} disabled={lastWasNumber || used} className={`digit-btn ${used ? "used" : ""}`} onClick={() => { playSoundInternal("click"); if (!used && !lastWasNumber) { setExpression((p) => p + n); setLastWasNumber(true); } }}>{n}</button>;
                  })}</div>

                  <div className="ops-grid">{operators.map((op) => {
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

                    return <button key={op} disabled={isDisabled} className={className} onClick={() => { if (isDisabled) return; playSoundInternal("click"); setExpression((p) => p + op); if (["+", "-", "×", "÷", "(", "√"].includes(op)) setLastWasNumber(false); else if (op === ")") setLastWasNumber(true); }}>{op}</button>;
                  })}</div>

                  <input className="expression-box" readOnly value={expression} placeholder={T.buildEq} />

                  <div className="action-row">
                    <button className="equal-btn glass-btn" onClick={() => { playSoundInternal("click"); setExpression((p) => p.slice(0, -1)); setLastWasNumber(false); }}>{T.delete}</button>
                    <button className="equal-btn glass-btn" onClick={checkAnswer} disabled={submissionLockRef.current || digits.some((d) => !expression.includes(String(d)))}>{T.submit}</button>
                    <button className="skip-btn glass-btn" onClick={() => { playSoundInternal("click"); socket.emit("skipTurn", { mode, nickname }); setIsMyTurn(false); setRunning(false); setTimeLeft(mode === "hard" ? 30 : 60); setExpression(""); }}>⏭️ Skip Turn</button>
                  </div>
                </>
              )}
            </div>

            {resultPopup && resultPopup !== "endRound" && (
              <motion.div className={`popup ${resultPopup === "invalid" ? "invalid" : ""}`} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 120 }}>
                {resultPopup === "correct" && <h2>{T.correct}</h2>}
                {resultPopup === "wrong" && (<><h2>{T.wrong}</h2><p className="solution-text">💡 {T.solution}: <br /><span className="solution-highlight">{solutionExpr}</span></p></>)}
                {resultPopup === "timeout" && (<><h2>{T.timeout}</h2><p className="solution-text">💡 {T.solution}: <br /><span className="solution-highlight">{solutionExpr}</span></p></>)}
                {resultPopup === "invalid" && <h2>{T.invalidExpr}</h2>}
                {resultPopup === "gameover" && (<><h2>💀 Game Over</h2><p className="solution-text">Not enough players to continue.</p></>)}

                {autoResumeCount !== null && <p className="resume-count">Resuming next turn in <span className="highlight">{autoResumeCount}</span>s...</p>}

                {autoResumeCount === null && (<div className="popup-btns"><button onClick={() => { playSoundInternal("click"); startGame(mode); }}><FaRedo /> {T.playAgain}</button><button onClick={() => { playSoundInternal("click"); stopTimer(); setPage("stats"); }}><FaSignOutAlt /> {T.exit}</button></div>)}
              </motion.div>
            )}
          </motion.div>
        )}

        {page === "stats" && (
          <motion.div key="stats" {...fade} className="stats-page">
            <div className="stats-card">
              <h2 className="stats-title">{T.stats}</h2>
              <div className="scoreboard glass-card" style={{ padding: 16 }}>
                <table style={{ width: "100%" }}>
                  <thead><tr><th>{lang === "th" ? "ผู้เล่น" : lang === "zh" ? "玩家" : "Player"}</th><th style={{ textAlign: "right" }}>{lang === "th" ? "คะแนน" : lang === "zh" ? "分数" : "Score"}</th></tr></thead>
                  <tbody>{Object.entries(scores || {}).map(([name, sc]) => (<tr key={name}><td>{name === nickname ? (<span className="you-label">{lang === "th" ? "คุณ" : lang === "zh" ? "你" : "You"}</span>) : 
                  (name)}</td><td style={{ textAlign: "right" }}><strong>{sc}</strong></td></tr>))}</tbody>
                </table>
              </div>

              <div className="stats-actions" style={{ marginTop: 16 }}><button className="main-btn" onClick={() => { playSoundInternal("click"); setPage("mode"); }}><FaArrowLeft /> {T.back}</button></div>
            </div>
          </motion.div>
        )}

        
      </AnimatePresence>

      {reactionPopup && <div className="reaction-popup">{reactionPopup}</div>}
    </motion.div>
  );
}