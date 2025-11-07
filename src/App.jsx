/* =============================================================
 🧩 IQ180 React App (Production-ready Clean Code)
---------------------------------------------------------------
 This file includes all logic for:
 - Game state and timer system
 - Multiplayer socket events
 - Sound and UI management
 - Comprehensive comments for each major section (English)
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
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";
const socket = io(SERVER_URL, { autoConnect: true, transports: ["websocket", "polling"] });
//ถ้าเปลี่ยน router แม้ใช้ wifi ชื่อเดียวกัน ก็ต้องใส่ ip ใหม่
// เข้า Terminal เครื่อง แล้วพิมพ์:
// "ipconfig" (Window)
// "ifconfig | grep inet" (Mac)
// แล้วหา 	inet 10.201.213.149 netmask 0xffff8000 


export default function App() {
  /* 🌍 MULTI-LANGUAGE */
  const [lang, setLang] = useState("en");
  const texts = {
    en: {
      title: "IQ180",
      welcome: "Welcome",
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
      welcome: "ยินดีต้อนรับ",
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
      welcome: "欢迎",
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
  // 🧩 Multiplayer waiting room
  const [waitingPlayers, setWaitingPlayers] = useState([]);

  /* 🔊 SOUND ENGINE */
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const clickSound = new Howl({ src: [clickSoundFile], volume: 0.6 });
  const correctSound = new Howl({ src: [correctSoundFile], volume: 0.7 });
  const wrongSound = new Howl({ src: [wrongSoundFile], volume: 0.7 });
  const timeoutSound = new Howl({ src: [timeoutSoundFile], volume: 0.6 });
  const [bgm] = useState(() => new Howl({ src: [bgmFile], loop: true }));
  // ✅ คะแนนของทุกผู้เล่นในเกม (ชื่อ → คะแนน)
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
const [totalPlayers, setTotalPlayers] = useState(0); // ✅ เก็บจำนวนผู้เล่นในรอบ

const [showDemo, setShowDemo] = useState(false);
const [demoExpression, setDemoExpression] = useState("");
const [demoResult, setDemoResult] = useState(null);
const [demoUsedNums, setDemoUsedNums] = useState([false, false, false]);


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
const [solutionExpr, setSolutionExpr] = useState(""); // ✅ เก็บสมการเฉลยจริง
const [endByName, setEndByName] = useState(null); 
// 🧩 Keep latest problem refs for stable solution lookups
const problemRef = useRef({ digits: [], target: 0, disabledOps: [] });


/* 👥 Multiplayer & Room State */
const [playerList, setPlayerList] = useState([]); // รายชื่อผู้เล่นทั้งหมด (ออนไลน์)
const [canStart, setCanStart] = useState(false); // ห้องพร้อมเริ่มหรือยัง
const [preGameInfo, setPreGameInfo] = useState(null); // ข้อมูลก่อนเริ่ม (starter, mode, players)
const [countdown, setCountdown] = useState(0); // นับถอยหลังก่อนเริ่มเกม
const [showCountdown, setShowCountdown] = useState(false); // แสดง countdown popup หรือไม่
const [gameState, setGameState] = useState({}); // สถานะเกมกลาง (turn, order, ฯลฯ)
const [isMyTurn, setIsMyTurn] = useState(false); // ตอนนี้เป็นตาเราไหม

const [autoResumeCount, setAutoResumeCount] = useState(null);


/* 🕒 TIMER (Client-side synced with Player 1, global for all players) */
const [baseTime, setBaseTime] = useState(null);
const [timeLeft, setTimeLeft] = useState(60);
const [running, setRunning] = useState(false);
const timerRef = useRef(null);

/* ✅ เมื่อถึงตาเราเล่น */
socket.on("yourTurn", ({ mode }) => {
  console.log("🎯 It's your turn!");
  setIsMyTurn(true);

  // 🧩 ตรวจว่าตานี้เป็นตาแรกหรือไม่ (ยังไม่มี rounds)
  if (rounds === 0 && digits.length > 0) {
    console.log("🧩 First turn — using server-provided problem");
  } else {
    // ตาอื่นให้สร้างโจทย์ใหม่
    const gameData = generateProblem(mode);
    setDigits(gameData.digits);
    setOperators(gameData.operators);
    setDisabledOps(gameData.disabledOps);
    setTarget(gameData.target);
    setMode(gameData.mode);
  }

  // ตั้ง base time และเริ่ม timer (เฉพาะตอนที่ได้รับ sync แล้ว)
  const now = Date.now();
  setBaseTime(now);
  setTimeLeft(60);
  setRunning(true);

  // ถ้าเราเป็น host → เริ่ม timer sync
  if (gameState?.turnOrder?.[0] === nickname && rounds > 0) {
    const startTime = Date.now();
    socket.emit("syncTimer", { mode, startTime });
    console.log("🕒 Host started global timer:", new Date(startTime).toLocaleTimeString());
  }
});

/* 🕛 รับเวลาจาก host เพื่อ sync (ทุกคนรวมถึงคนรอ) */
socket.on("syncTimer", ({ mode, startTime }) => {
  console.log(`🕛 Synced timer from host: ${new Date(startTime).toLocaleTimeString()}`);

  // ทุกคนใช้ baseTime เดียวกัน
  setBaseTime(startTime);
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const remain = Math.max(60 - elapsed, 0);

  setTimeLeft(remain);
  setRunning(true);
});

/* 🔁 เมื่อสลับเทิร์น ให้หยุด timer ชั่วคราว */
socket.on("turnSwitch", (data) => {
  console.log("🔁 Turn switched:", data);
  setGameState((prev) => ({
    ...prev,
    currentTurn: data.nextTurn,
  }));

  // ✅ อัปเดตรอบจาก server
  if (data.round !== undefined) {
    setRounds(data.round);
    console.log(`📦 Updated Round from server: ${data.round}`);
  }

  setIsMyTurn(data.nextTurn === nickname);
  setRunning(false);
});


/* 🕒 จับเวลาแบบ global ทุก client (รวมถึงคนรอ) */
useEffect(() => {
  if (!running || baseTime === null) return;

  const tick = () => {
    const elapsed = Math.floor((Date.now() - baseTime) / 1000);
    const remaining = Math.max(60 - elapsed, 0);
    setTimeLeft(remaining);

    // ถ้าเวลาเหลือ 0 → หมดเวลา
    if (remaining <= 0) {
      clearInterval(timerRef.current);
      setRunning(false);
      playSound("timeout");
    
      // ✅ ใช้โจทย์ล่าสุดจาก ref (กันค่า timeout ก่อนหน้าค้าง)
      const { digits, target, disabledOps } = problemRef.current;
      const sol = findSolution(digits, target, disabledOps);
      setSolutionExpr(sol || "No valid solution found");
    
      // ✅ เปิด popup หลังตั้ง solutionExpr แล้ว
      setResultPopup("timeout");

      // แจ้ง server ว่าหมดเวลา
      socket.emit("answerResult", {
        nickname,
        result: "timeout",
        correct: false,
        score,
        round: rounds + 1,
        mode,
      });

      // Auto resume 3 วินาที
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
            socket.emit("resumeGame", { mode });
            setIsMyTurn(false);
          }
          
        }
      }, 1000);
    }
  };

  timerRef.current = setInterval(tick, 1000);
  return () => clearInterval(timerRef.current);
}, [running, baseTime]);

/* ✅ CHECK ANSWER (Smart Validation) */
const checkAnswer = () => {
  try {
    const expr = expression.trim();

    // 🧩 Validation
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

    // 🧮 Evaluate
    const clean = expr
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/\^/g, "**")
      .replace(/√(\d+|\([^()]+\))/g, "Math.sqrt($1)");

    const result = eval(clean);
    const correct = Number.isFinite(result) && Math.abs(result - target) < 1e-9;

    // ✅ แสดง popup + เสียง
    if (correct) {
      playSound("correct");
      setScore((s) => s + 1);
      setResultPopup("correct");
  
      setSolutionExpr(""); // ไม่ต้องแสดงเฉลยเพราะตอบถูก
    } else {
      playSound("wrong");
      setResultPopup("wrong");

      // 🧠 หาเฉลยอัตโนมัติ
      const sol = findSolution(digits, target, disabledOps);
      setSolutionExpr(sol || "No valid solution found");
    }

    // 🧾 เก็บประวัติ
    setHistory((h) => [...h, { round: rounds + 1, result, ok: correct }]);

    // 🔄 ส่งผลลัพธ์ไป server
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

    // ⏳ เริ่ม auto resume
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
  } catch (err) {
    console.error("❌ Expression error:", err);
    setResultPopup("invalid");
  }
};
// 🛑 STOP TIMER (safe)
const stopTimer = () => {
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
};

// 👑 HOST CHECK (คงไว้เสมอ เผื่อ JSX ใช้)
const isHost = gameState?.turnOrder?.[0] === nickname;

// 🧨 END GAME FOR ALL (ทุกคนเห็น Game Over popup)
const endGameForAll = () => {
  // กันกดซ้ำ/กันยิงซ้ำขณะอยู่ popup อยู่แล้ว
  if (resultPopup === "gameover") return;

  try {
    playSound("click");
  } catch {}

  stopTimer();
  setRunning(false);

  // ให้เราเห็น popupทันที
  setResultPopup("gameover");

  // แจ้ง server ให้ broadcast ไปทั้งห้อง (ถ้า server รองรับ)
  if (socket && socket.connected) {
    socket.emit("endGame", { mode, by: nickname, reason: "endedByPlayer" });
  }
};

// 🚪 LEAVE GAME (เผื่อ JSX ที่ไหนยังเรียกอยู่ จะไม่พังหน้าดำ)
// ทำให้พฤติกรรม "ออก" ก็เจอ popup เหมือนคนอื่น (ตามที่คุณต้องการ)
const leaveGame = () => {
  try {
    playSound("click");
  } catch {}

  stopTimer();
  setRunning(false);

  // เห็น popup game over แบบเดียวกัน
  setResultPopup("gameover");

  // แจ้ง server ว่าเราออก (server อาจจบเกมถ้าเหลือคนน้อย)
  if (socket && socket.connected) {
    socket.emit("playerLeftGame", { nickname, mode });
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

/* 🧩 SOCKET.IO CLIENT CONNECTION */
useEffect(() => {
  if (!socket) return;

  // 🟢 เมื่อเชื่อมต่อสำเร็จ
  socket.on("connect", () => {
    console.log("🟢 Connected to server");
    if (page === "mode" && nickname.trim()) {
      socket.emit("setNickname", nickname); // ✅ ออนไลน์เมื่อเข้า mode page
      console.log(`✅ ${nickname} marked as online`);
    }
  });

  // 👥 รายชื่อผู้เล่นทั้งหมด (หน้าเลือกโหมด)
  socket.on("playerList", (list) => {
    console.log("👥 Players online:", list);
    setPlayerList(list);
  });

  // 🕹️ รายชื่อใน waiting room เดียวกัน
  socket.on("waitingList", (data) => {
    if (data.mode === mode) {
      console.log(`🕹️ Waiting list for ${mode}:`, data.players);
      setWaitingPlayers(data.players);
    }
  });

  // ✅ เมื่อห้องพร้อมเริ่ม
  socket.on("canStart", (data) => {
    if (data.mode === mode) setCanStart(data.canStart);
  });

  // ⏳ ก่อนเริ่มเกม (countdown + starter info)
  socket.on("preGameStart", (data) => {
    console.log("⏳ Pre-game starting:", data);

    // แสดง popup countdown
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

  socket.on("gameStart", (data) => {
    console.log("🚀 Game started from server:", data);

    
    setDigits(data.digits || []);
    setOperators(data.operators || []);
    setDisabledOps(data.disabledOps || []);
    setTarget(data.target || 0);
    setMode(data.mode || "easy");
    setSolutionExpr(data.expr || "No valid solution from server"); // ✅ เก็บสมการที่ server ส่งมา

      // ✅ อัปเดตค่าโจทย์ล่าสุดสำหรับ timeout
    problemRef.current = {
      digits: data.digits || [],
      target: data.target || 0,
      disabledOps: data.disabledOps || [],
    };
    setSolutionExpr(""); // กัน solution เดิมค้าง
    // ✅ สร้าง scoreboard ให้ครบทุกคนตั้งแต่เริ่ม
const list =
Array.isArray(data.players) && data.players.length > 0
  ? data.players
  : (Array.isArray(data.turnOrder) ? data.turnOrder : []);
const uniquePlayers = Array.from(new Set([...list, nickname]));
setScores(Object.fromEntries(uniquePlayers.map((p) => [p, 0])));



    // ตั้งสถานะเกม
    setGameState(data);
    const myTurn = data.currentTurn === nickname;
    setIsMyTurn(myTurn);
  
    // ให้ทุกคนเข้าเกมพร้อมกัน
    setPage("game");
  
    // ถ้าเป็นคนเล่น → เปิด timer
    if (myTurn) {
      setRunning(true);
      setTimeLeft(data.mode === "hard" ? 30 : 8);
    } else {
      // ถ้าเป็นคนรอ → หยุด timer (เพื่อไม่ให้เวลาวิ่งมั่ว)
      setRunning(false);
      setTimeLeft(data.mode === "hard" ? 30 : 60);
    }
  
    // รีเซ็ตสถานะพื้นฐาน
    setExpression("");
    setLastWasNumber(false);
    setLastWasSqrt(false);
    setResultPopup(null);
    setSolution(null);
    setScore(0);
    setRounds(0);
  
    console.log("🎯 Current turn:", data.currentTurn);
  });
  
  // 📦 รับโจทย์ใหม่จาก server
  socket.on("newRound", (data) => {
    setDigits(data.digits);
    setOperators(data.operators);
    setDisabledOps(data.disabledOps);
    setTarget(data.target);
    setRounds(data.round);
    setExpression("");
    setLastWasNumber(false);
    setResultPopup(null);
    setSolutionExpr(data.expr || "No valid solution from server");

  
    // ✅ sync โจทย์ล่าสุด
    problemRef.current = {
      digits: data.digits,
      target: data.target,
      disabledOps: data.disabledOps,
    };
    setSolutionExpr("");
  });
  

  
  // 🔁 สลับเทิร์นผู้เล่น
  socket.on("turnSwitch", (data) => {
    console.log("🔁 Turn switched:", data);

    setGameState((prev) => ({
      ...prev,
      currentTurn: data.nextTurn,
    }));
  
    // ✅ ใช้ค่า round จาก serverโดยตรง
    if (data.round !== undefined) {
      setRounds(data.round);
      console.log(`📦 Synced round from server: ${data.round}`);
    }
  
    setIsMyTurn(data.nextTurn === nickname);
    setRunning(false);
  });
  
  /* 💀 เมื่อเกมผู้เล่นเหลือน้อยเกินไป */
  socket.on("gameover", (data) => {
    console.log("💀 Game over:", data);
    setEndByName(data?.by || null);   // ✅ เก็บชื่อผู้กดจาก server ถ้ามี
    setResultPopup("gameover");
    stopTimer();
    setRunning(false);
  });
  

  // 🎯 เมื่อถึงตาเราเล่น (server ส่งสัญญาณ yourTurn)
  socket.on("yourTurn", ({ mode }) => {
    console.log("🧩 It's now your turn to generate a problem!");

    // ✅ สร้างโจทย์ใหม่เฉพาะของเรา
    const gameData = generateProblem(mode);
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

    // ✅ ตั้งค่า state สำหรับเริ่มเล่น
    setRunning(true);
    setIsMyTurn(true);
    setExpression("");
    setLastWasNumber(false);
    setLastWasSqrt(false);
    setResultPopup(null);
    setSolution(null);
    setPage("game");
    
      // ✅ รีเซ็ตทุก state สำคัญก่อนเริ่มเทิร์นใหม่
  setDisabledOps([]);
  setResultPopup(null);
  setExpression("");
  setLastWasNumber(false);
  setLastWasSqrt(false);
  setSolutionExpr("");
  setRunning(true);


    // ✅ อัปเดต gameState ให้ currentTurn เป็นเราด้วย
    setGameState((prev) => ({ ...prev, currentTurn: nickname }));

    console.log("🎮 Your turn started with target:", gameData.target);
  });

  // 🧮 ผลลัพธ์ของคำตอบ (sync จากผู้เล่นอื่น)
  socket.on("answerResult", (data) => {
    console.log("📩 Answer result:", data);
  
    // ✅ อัปเดต scoreboard จาก server สำหรับผู้เล่นคนที่ตอบ (รวมตัวเราเอง)
    setScores((prev) => {
      const next = { ...prev };
      if (!(data.nickname in next)) next[data.nickname] = 0;
      if (data.correct) next[data.nickname] += 1;
      return next;
    });
  
    // (ออปชัน) sync รอบจาก server
    if (data.round !== undefined) setRounds(data.round);
  
    // ไม่ต้อง popup ซ้อน; แค่ log
    if (data.nickname !== nickname) {
      if (data.correct) {
        console.log(`✅ ${data.nickname} answered correctly!`);
      } else {
        console.log(`❌ ${data.nickname} answered wrong.`);
      }
    }
  });
  

  // 🚪 เมื่อผู้เล่นออกจากห้องหรือ disconnect
  socket.on("playerLeft", (data) => {
    console.log(`🚪 ${data.nickname} left ${data.mode}`);
    if (data.mode === mode) {
      setWaitingPlayers((prev) => prev.filter((p) => p !== data.nickname));
    }
  });


  // 🧹 cleanup (สำคัญมาก ป้องกัน event ซ้ำ)
  return () => {
    socket.off("connect");
    socket.off("playerList");
    socket.off("waitingList");
    socket.off("canStart");
    socket.off("preGameStart");
    socket.off("gameStart");
    socket.off("turnSwitch");
    socket.off("yourTurn");
    socket.off("answerResult");
    socket.off("playerLeft");
  };
}, [nickname, page, mode]);

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

      if (page === "game") {
        stopTimer();

        // ✅ ใช้ mode จาก gameState ถ้ามี (กัน state ค้าง)
        const activeMode = gameState?.mode || mode;

        socket.emit("playerLeftGame", {
          nickname,
          mode: activeMode,
        });

        setRunning(false);
        setIsMyTurn(false);
        setPage("mode"); // กลับไปหน้าเลือกโหมด
      } 
      else if (page === "waiting" || page === "mode") {
        socket.emit("leaveLobby", nickname);
        socket.disconnect();
        setPage("login");
      } 
      else {
        setPage("login");
      }
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
      socket.emit("setNickname", nickname); // แจ้ง server ว่า online
      setPage("intro"); // ← go to intro so demo is available
    }
  }}
>
  {T.start} <FaArrowRight />
</button>


            </div>
          </motion.div>
        )}

        {/* INTRO PAGE (integrated) ------------------------------------------------ */}
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
                  onClick={() => { playSound("click"); setShowDemo(p => !p); setDemoExpression(""); setDemoResult(null); setDemoUsedNums([false, false, false]); }}
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

{/* MODE PAGE ------------------------------------------------ */}
{page === "mode" && (
  <motion.div key="mode" className="mode-page" {...fade}>
    <h2 className="big-player">
      {T.playerName}: <span>{nickname}</span>
    </h2>

    {/* 👥 รายชื่อผู้เล่นออนไลน์ */}
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
  </motion.div>
)}

{/* WAITING ROOM PAGE ------------------------------------------------ */}
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
      <span className="highlight">
        {mode === "easy" ? T.easy : T.hard}
      </span>
    </h2>

    <div className="waiting-box glass-card">
      {waitingPlayers.length > 0 ? (
        <ul>
          {waitingPlayers.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
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
      socket.emit("startGame", { mode, nickname });
    }}
  >

  🚀 {lang === "th" ? "เริ่มเกม" : lang === "zh" ? "开始游戏" : "Start Game"}
</button>



    )}

<button
  className="secondary-btn"
  onClick={() => {
    playSound("click");
    socket.emit("leaveGame", { nickname, mode }); // ออกจากห้อง แต่ยัง online
    setPage("mode"); // กลับไปหน้าเลือกโหมด
  }}
>
  ← {lang === "th" ? "ออกจากห้อง" : lang === "zh" ? "离开房间" : "Leave Room"}
</button>

  </motion.div>
)}
{/* PRE-GAME POPUP ------------------------------------------------ */}
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


{/* GAME PAGE ------------------------------------------------ */}
{page === "game" && (
  <motion.div key="game" className="game-page" {...fade}>
    {/* HEADER */}
    
    {/* GAME HEADER */}
<div className="game-header">
  {/* 🧑‍💼 แสดงเฉพาะชื่อเรา */}
  <h2 className="big-player">
    {T.playerName}: <span>{nickname}</span>
  </h2>

    {/* 🔘 Game controls */}
    {/* 🔘 Game controls — bottom center */}
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
        zIndex: 20,              // ให้อยู่เหนือเนื้อหา แต่ไม่ทับ popup ถ้าคุณตั้ง popup เป็น zIndex สูงกว่า
        padding: "8px 12px",
        borderRadius: 12,
        backdropFilter: "blur(6px)",
      }}
    >
      <button className="glass-btn" onClick={leaveGame}>
        <FaSignOutAlt /> {lang === "th" ? "จบเกม" : lang === "zh" ? "结束游戏" : "End Game"}
      </button>

      {/* จบเกมทั้งห้อง (โชว์เฉพาะโฮสต์) */}
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


  {/* 🎯 สถานะการเล่น */}
  {isMyTurn ? (
    <>
      <h3 className="turn-status">🎯 It's your turn!</h3>

      {/* สถิติ gameplay */}
      <div className="game-stats">
        <p className="round-display">
          Round: <span className="highlight">{rounds}</span>
        </p>
        <h1 className="target-title">
          {T.target}: <span className="highlight">{target}</span>
        </h1>
        <p
          className={timeLeft <= 10 ? "time-score time-low" : "time-score"}
        >
          {T.timeLeft}: {timeLeft}s
        </p>
        <p>
          {T.score}: {score}
        </p>
      </div>
    </>
  ) : (
    // 🔹 ถ้าไม่ใช่ตาเรา → แสดงเฉพาะ waiting message
    <div className="waiting-header">
      <h3 className="turn-status">
        ⏳ Waiting for{" "}
        <span className="highlight">{gameState?.currentTurn}</span>...
      </h3>
      <h1
        className={`waiting-time ${
          timeLeft <= 10 ? "time-critical" : ""
        }`}
      >
        {timeLeft > 0 ? `${timeLeft}s` : "00s"}
      </h1>
    </div>
  )}
</div>


    {/* 🎮 GAME BODY */}
{!isMyTurn ? (
  // ---------------- WAITING TURN ----------------
  <div className="waiting-turn glass-card">
    <h2 className="waiting-title">
      ⏳ Waiting for{" "}
      <span className="highlight">{gameState?.currentTurn}</span>...
    </h2>

    {/* เวลาใหญ่ตรงกลาง */}
    <div className="waiting-timer">
      <h1
        className={`time-left ${
          timeLeft <= 10 ? "time-critical" : ""
        }`}
      >
        {timeLeft > 0 ? `${timeLeft}s` : "00s"}
      </h1>
    </div>

    <p className="hint-text">
      Please wait until it's your turn to play.
    </p>
  </div>
) : (
  // ---------------- ACTIVE TURN ----------------
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

{/* OPERATORS */}
<div className="ops-grid">
  {operators.map((op) => {
    const lastChar = expression.slice(-1);

    // ✅ นับจำนวนวงเล็บเปิด–ปิดในสมการปัจจุบัน
    const openCount = (expression.match(/\(/g) || []).length;
    const closeCount = (expression.match(/\)/g) || []).length;
    const canCloseParen = openCount > closeCount; // ต้องมีวงเล็บเปิดค้างไว้ก่อนถึงจะปิดได้

    // ✅ ตรวจ logic ของแต่ละปุ่ม
    const canPressRoot =
      lastChar === "" || ["+", "-", "×", "÷", "("].includes(lastChar); // √ ต่อหลัง operator หรือ (
    const canPressOpenParen =
      lastChar === "" || ["+", "-", "×", "÷", "("].includes(lastChar); // ( ต่อหลัง operator หรือ (
    const canPressCloseParen =
      lastChar !== "" && /[\d)]$/.test(lastChar) && canCloseParen; // ) ต่อหลังเลขหรือ ) และต้องมี ( เหลืออยู่
    const canPressOperator =
      lastChar !== "" && !["+", "-", "×", "÷", "("].includes(lastChar); // ห้าม operator ซ้ำ

    // ✅ เงื่อนไข disable (logic)
    let logicDisabled = false;
    if (op === "√" && !canPressRoot) logicDisabled = true;
    if (op === "(" && !canPressOpenParen) logicDisabled = true;
    if (op === ")" && !canPressCloseParen) logicDisabled = true;
    if (["+", "-", "×", "÷"].includes(op) && !canPressOperator) logicDisabled = true;

    // ✅ เงื่อนไข disable จาก server (ล็อกเครื่องหมาย)
    const lockedDisabled = disabledOps.includes(op);

    // 🔒 รวมผลสุดท้าย
    const isDisabled = logicDisabled || lockedDisabled;
    const className = lockedDisabled ? "op-btn disabled" : "op-btn";

    return (
      <button
        key={op}
        disabled={isDisabled}
        className={className}
        onClick={() => {
          if (isDisabled) return; // ไม่ให้กดถ้า logic หรือ locked
          playSound("click");

          setExpression((prev) => prev + op);

          // 🎯 อัปเดต state
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
        disabled={digits.some((d) => !expression.includes(String(d)))}
      >
        {T.submit}
      </button>
    </div>
  </>
)}

{/* 🧩 POPUP SYSTEM ------------------------------------------------ */}
{resultPopup && resultPopup !== "endRound" && (
  <motion.div
    className={`popup ${resultPopup === "invalid" ? "invalid" : ""}`}
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: "spring", stiffness: 120 }}
  >
    {/* ✅ ถูก */}
    {resultPopup === "correct" && <h2>{T.correct}</h2>}

    {/* ❌ ผิด */}
    {resultPopup === "wrong" && (
  <>
    <h2>{T.wrong}</h2>
    <p className="solution-text">
      💡 {T.solution}: <br />
      <span className="solution-highlight">{solutionExpr}</span>
    </p>
  </>
)}


    {/* ⏰ หมดเวลา */}
    {resultPopup === "timeout" && (
      <>
        <h2>{T.timeout}</h2>
        <p className="solution-text">
          💡 {T.correctAnswer || "Possible Solution"}: <br />
          <span className="solution-highlight">{solutionExpr}</span>
        </p>
      </>
    )}

    {/* 🚫 invalid */}
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
    {/* ... ปุ่มเดิม Play Again / Exit ... */}
  </>
)}


    {/* 🕒 นับถอยหลังอยู่ใน popup เดิมเลย */}
    {autoResumeCount !== null && (
  <p className="resume-count">
    Resuming next turn in <span className="highlight">{autoResumeCount}</span>s...
  </p>
)}


    {/* ปุ่มจะไม่โชว์ระหว่าง auto resume */}
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
  <motion.div
    className="popup"
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: "spring", stiffness: 120 }}
  >
    <h2>🏁 End of Round {rounds}</h2>
    <p className="solution-text">
      {lang === "th"
        ? "รอบนี้จบแล้ว! พร้อมเริ่มรอบถัดไปหรือไม่?"
        : "Round complete! Ready for the next one?"}
    </p>
    <div className="popup-btns">
      <button
        onClick={() => {
          playSound("click");
          socket.emit("resumeGame", { mode });
          setResultPopup(null);
        }}
      >
        <FaRedo /> {T.playAgain}
      </button>
      <button
        onClick={() => {
          playSound("click");
          socket.emit("playerLeftGame", { nickname, mode });
          setPage("login");
        }}
      >
        <FaSignOutAlt /> {T.exit}
      </button>
    </div>
  </motion.div>
)}{page === "stats" && (
  <motion.div key="stats" {...fade} className="stats-page">
    <div className="stats-card">
      <h2 className="stats-title">{T.stats}</h2>

      {(() => {
        // ✅ รายชื่อ + คะแนนจาก state (ถ้ามี)
        const entries = Object.entries(scores ?? {});

        // ✅ Fallback รายชื่อผู้เล่น หาก scores ยังว่าง
        const turnOrder = Array.isArray(gameState?.turnOrder) ? gameState.turnOrder : [];
        const waiters = Array.isArray(waitingPlayers) ? waitingPlayers : [];
        const basePlayers = [...new Set([...turnOrder, ...waiters, nickname].filter(Boolean))];

        // ✅ สร้าง rowsRaw เสมอ (ถ้าไม่มีคะแนน ให้เป็น 0)
        const rowsRaw =
          entries.length > 0
            ? entries // [['A',1],['B',0], ...]
            : basePlayers.map((name) => [name, 0]);

        if (rowsRaw.length === 0) {
          return (
            <p style={{ textAlign: "center", marginTop: 12 }}>
              {lang === "th" ? "ยังไม่มีผู้เล่น" : lang === "zh" ? "暂无玩家" : "No players yet"}
            </p>
          );
        }

        // ✅ เรียงคะแนน มาก→น้อย
        const sorted = [...rowsRaw].sort((a, b) => b[1] - a[1]);
        const [winName, winScore] = sorted[0];

        return (
          <>
            {/* 🏆 Winner */}
            <div className="winner-banner" style={{ margin: "8px 0 16px", textAlign: "center" }}>
              <h3 style={{ margin: 0 }}>
                🏆 {lang === "th" ? "ผู้ชนะ" : lang === "zh" ? "获胜者" : "Winner"}:{" "}
                <span className="highlight">{winName}</span>
              </h3>
              <p style={{ marginTop: 6 }}>
                {lang === "th" ? "คะแนน" : lang === "zh" ? "分数" : "Score"}:{" "}
                <strong>{winScore}</strong>
              </p>
            </div>

            {/* 📊 Scoreboard: ผู้เล่นทั้งหมด */}
            <div className="scoreboard glass-card" style={{ padding: 16 }}>
              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 8px" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>
                      {lang === "th" ? "ผู้เล่น" : lang === "zh" ? "玩家" : "Player"}
                    </th>
                    <th style={{ textAlign: "right" }}>
                      {lang === "th" ? "คะแนน" : lang === "zh" ? "分数" : "Score"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(([name, sc]) => (
                    <tr key={name}>
                      <td>
                        {name === nickname ? (
                          <span className="you-label" style={{ marginRight: 6 }}>
                            {lang === "th" ? "คุณ" : lang === "zh" ? "你" : "You"}
                          </span>
                        ) : null}
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

      {/* 🔙 Back */}
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
