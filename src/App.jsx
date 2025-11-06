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
const socket = io("http://192.168.1.178:4000");
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
const [showWelcomePopup, setShowWelcomePopup] = useState(false);
const [hasConfirmedName, setHasConfirmedName] = useState(false);


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
      setResultPopup("timeout");
      playSound("timeout");

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
          socket.emit("resumeGame", { mode });
          setIsMyTurn(false);
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

    // ❌ ถ้าไม่มีเลขเลย
    if (!/\d/.test(expr)) {
      setResultPopup("invalid");
      return;
    }

    // ❌ ถ้าเริ่มต้นด้วย operator ที่ไม่ใช่ √ หรือ (
    if (/^[+\-×÷*/)]/.test(expr)) {
      setResultPopup("invalid");
      return;
    }

    // ❌ ถ้าจบด้วย operator ที่ไม่ใช่ ) 
    if (/[+\-×÷*/(]$/.test(expr)) {
      setResultPopup("invalid");
      return;
    }

    // ✅ แปลงสัญลักษณ์
    const clean = expr
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/\^/g, "**")
      .replace(/√(\d+|\([^()]+\))/g, "Math.sqrt($1)");

    // 🧮 คำนวณผลลัพธ์
    const result = eval(clean);
    const correct = Number.isFinite(result) && Math.abs(result - target) < 1e-9;

    if (correct) {
      playSound("correct");
      setScore((s) => s + 1);
      setResultPopup("correct");
    } else {
      playSound("wrong");
      setResultPopup("wrong");
    }

    // ✅ บันทึกลงประวัติ
    setHistory((h) => [
      ...h,
      { round: rounds + 1, result, ok: correct },
    ]);

    // ✅ ส่งข้อมูลขึ้น server
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

// 🧮 หลังตรวจคำตอบเสร็จ
if (correct) {
  playSound("correct");
  setScore((s) => s + 1);
  setResultPopup("correct");
} else {
  playSound("wrong");
  setResultPopup("wrong");
}

// ✅ เริ่ม auto-resume countdown
let count = 3;
setAutoResumeCount(count);

const timer = setInterval(() => {
  count -= 1;
  setAutoResumeCount(count);
  if (count <= 0) {
    clearInterval(timer);
    setAutoResumeCount(null);
    setResultPopup(null);

    // 🔁 แจ้ง server ว่าสลับเทิร์นไปคนต่อไป
    socket.emit("resumeGame", { mode });
    setIsMyTurn(false);
  }
}, 1000);

  } catch (err) {
    console.error("❌ Expression error:", err);
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
  
    // ตั้งสถานะเกม
    setGameState(data);
    const myTurn = data.currentTurn === nickname;
    setIsMyTurn(myTurn);
  
    // ให้ทุกคนเข้าเกมพร้อมกัน
    setPage("game");
  
    // ถ้าเป็นคนเล่น → เปิด timer
    if (myTurn) {
      setRunning(true);
      setTimeLeft(data.mode === "hard" ? 30 : 60);
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
    console.log("🧩 Received new round problem:", data);

    setDigits(data.digits);
    setOperators(data.operators);
    setDisabledOps(data.disabledOps);
    setTarget(data.target);
    setRounds(data.round);
    setExpression("");
    setLastWasNumber(false);
    setResultPopup(null);
  });

  
  // 🔁 สลับเทิร์นผู้เล่น
  socket.on("turnSwitch", (data) => {
    console.log("🔁 Turn switched:", data);

    setGameState((prev) => ({
      ...prev,
      currentTurn: data.nextTurn,
    }));
  
    // ✅ ใช้ค่า round จาก server โดยตรง
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

    // ป้องกันไม่ให้ popup ซ้อนกับฝั่งตัวเอง
    if (data.nickname === nickname) return;

    // แค่โชว์ว่ามีคนเล่น (ไม่ต้องโชว์เฉลย)
    if (data.correct) {
      console.log(`✅ ${data.nickname} answered correctly!`);
    } else {
      console.log(`❌ ${data.nickname} answered wrong.`);
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
{page === "login" && !showWelcomePopup && (
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
            socket.emit("setNickname", nickname); // notify server immediately
            setShowWelcomePopup(true); // open popup
          }
        }}
      >
        {T.start} <FaArrowRight />
      </button>
    </div>
  </motion.div>
)}


{showWelcomePopup && (
  <motion.div
    key="welcome-popup"
    className="fixed inset-0 flex items-center justify-center z-50 bg-gradient-to-b from-[#1a2238]/95 to-[#0d1323]/95 backdrop-blur-md"
    initial={{ opacity: 0, scale: 0.95, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95, y: 20 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
  >
    <div className="max-w-xl w-[90%] rounded-3xl shadow-2xl p-10 border border-white/10 
                    bg-gradient-to-b from-[#273c75]/90 to-[#192a56]/90 text-white backdrop-blur-md">
      {/* Title */}
      <h2 className="text-3xl font-bold text-center mb-2">
        Welcome, <span className="text-[#8ec5fc]">{nickname || "player"}</span>!
      </h2>
      <p className="text-center text-gray-300 mb-8">
        Welcome! Here’s how to play and a few tips before you start.
      </p>
      <br></br>

      {/* How to Play */}
      <div className="bg-white/10 rounded-2xl px-8 py-6 mb-6 backdrop-blur-sm">
        <h3 className="text-xl font-semibold mb-4 text-center">How to Play</h3>
        <div className="space-y-3 text-sm text-gray-300 leading-relaxed">
          <p>🎯 <b>Goal:</b> Build an equation from the digits to match the target number.</p>
          <p>➕➖✖️➗ <b>Operators:</b> Choose operators and click digits to form the equation.</p>
          <p>⏰ <b>Time:</b> 60 seconds per turn (Genius mode may be shorter).</p>
          <p>✅❌ <b>System:</b> Auto-checks answers and updates score.</p>
          <p>👥 <b>Multiplayer:</b> Turns automatically switch between players.</p>
          <br></br>
          <br></br>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-white/10 rounded-2xl px-6 py-4 text-center mb-8 backdrop-blur-sm">
        <h4 className="text-lg font-semibold mb-2">Tips</h4>
        <p className="text-sm text-gray-300">
          Start with simple combinations; avoid division by zero and try operator order to match target.
        </p>
        <br></br>
      </div>

      {/* Buttons */}
      <div className="flex justify-between gap-4">
        <button
          className="main-btn"
          onClick={() => {
            playSound("click");
            setShowWelcomePopup(false);
            setNickname("");
            setPage("login");
          }}
        >
          ← Back
        </button>
        <button
          className="main-btn"
          onClick={() => {
            playSound("click");
            setShowWelcomePopup(false);
            setHasConfirmedName(true);
            setPage("mode");
            if (socket && nickname.trim()) socket.emit("setNickname", nickname);
          }}
        >
          Continue to Game Mode →
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
      {operators.map((op) => (
        <button
          key={op}
          disabled={disabledOps.includes(op) || !lastWasNumber}
          className={`op-btn ${
            disabledOps.includes(op) ? "disabled" : ""
          }`}
          onClick={() => {
            if (!disabledOps.includes(op) && lastWasNumber) {
              playSound("click");
              setExpression((p) => p + op);
              setLastWasNumber(false);
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
    {resultPopup === "wrong" && <h2>{T.wrong}</h2>}

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

    {/* 💀 Game Over */}
    {resultPopup === "gameover" && (
      <>
        <h2>💀 Game Over</h2>
        <p className="solution-text">Not enough players to continue.</p>
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
