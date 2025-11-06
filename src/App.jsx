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
  FaTrophy,
} from "react-icons/fa";
import "./App.css";

import clickSoundFile from "./sounds/click.mp3";
import correctSoundFile from "./sounds/correct.mp3";
import wrongSoundFile from "./sounds/wrong.mp3";
import timeoutSoundFile from "./sounds/timeout.mp3";
import bgmFile from "./sounds/bgm.mp3";

import { io } from "socket.io-client";
/** NOTE:
 * If you change router or IP, update the URL below.
 * Example: "http://192.168.1.178:4000"
 */
const socket = io("http://192.168.1.178:4000");

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
  const [totalPlayers, setTotalPlayers] = useState(0); // ✅ number of players in round

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
  const [solutionExpr, setSolutionExpr] = useState(""); // ✅ solution expression text

  /* 👥 Multiplayer & Room State */
  const [playerList, setPlayerList] = useState([]); // online players
  const [canStart, setCanStart] = useState(false);
  const [preGameInfo, setPreGameInfo] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [showCountdown, setShowCountdown] = useState(false);
  const [gameState, setGameState] = useState({});
  const [isMyTurn, setIsMyTurn] = useState(false);

  const [autoResumeCount, setAutoResumeCount] = useState(null);

  /* 🏆 LEADERBOARD */
  const [leaderboard, setLeaderboard] = useState([]);

  /* 🕒 TIMER (Client-side synced with Player 1, global for all players) */
  const [baseTime, setBaseTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [running, setRunning] = useState(false);
  const timerRef = useRef(null);

  /* -----------------------
     Helper functions
  ------------------------*/
  const stopTimer = () => {
    clearInterval(timerRef.current);
    setRunning(false);
    setBaseTime(null);
  };

  const startGame = (selectedMode) => {
    // trigger start from client (host)
    socket.emit("startGame", { mode: selectedMode, nickname });
  };

  // lightweight client-side problem generator fallback
  const generateProblem = (modeParam = "easy") => {
    const nums = Array.from({ length: 9 }, (_, i) => i + 1);
    const selected = [];
    while (selected.length < 5) {
      const idx = Math.floor(Math.random() * nums.length);
      selected.push(nums.splice(idx, 1)[0]);
    }
    const baseOps = ["+", "-", "×", "÷"];
    const dis = [];
    if (modeParam === "hard") {
      while (dis.length < 2) {
        const op = baseOps[Math.floor(Math.random() * baseOps.length)];
        if (!dis.includes(op)) dis.push(op);
      }
    }
    const allOps = modeParam === "hard" ? baseOps.concat(["√", "(", ")"]) : baseOps;
    // choose a simple target (sum of first two for fallback)
    const targetFallback = selected.slice(0, 2).reduce((a, b) => a + b, 0);
    return {
      digits: selected,
      operators: allOps,
      disabledOps: dis,
      target: targetFallback,
      mode: modeParam,
    };
  };

  /* ✅ when it's your turn (legacy handler kept but we also rely on server sync) */
  useEffect(() => {
    // keep local handler for 'yourTurn' event only once
    const onYourTurn = ({ mode: turnMode }) => {
      console.log("🎯 It's your turn!");
      setIsMyTurn(true);

      if (rounds === 0 && digits.length > 0) {
        console.log("🧩 First turn — using server-provided problem");
      } else {
        const gameData = generateProblem(turnMode);
        setDigits(gameData.digits);
        setOperators(gameData.operators);
        setDisabledOps(gameData.disabledOps);
        setTarget(gameData.target);
        setMode(gameData.mode);
      }

      const now = Date.now();
      setBaseTime(now);
      setTimeLeft(60);
      setRunning(true);

      if (gameState?.turnOrder?.[0] === nickname && rounds > 0) {
        const startTime = Date.now();
        socket.emit("syncTimer", { mode: turnMode, startTime });
        console.log("🕒 Host started global timer:", new Date(startTime).toLocaleTimeString());
      }
    };

    socket.on("yourTurn", onYourTurn);
    return () => {
      socket.off("yourTurn", onYourTurn);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, digits, gameState, nickname]);

  /* 🕛 Sync timer received from host */
  useEffect(() => {
    const onSyncTimer = ({ mode: m, startTime }) => {
      console.log(`🕛 Synced timer from host: ${new Date(startTime).toLocaleTimeString()}`);
      setBaseTime(startTime);
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remain = Math.max((m === "hard" ? 30 : 60) - elapsed, 0);
      setTimeLeft(remain);
      setRunning(true);
    };

    socket.on("syncTimer", onSyncTimer);
    return () => socket.off("syncTimer", onSyncTimer);
  }, []);

  /* 🔁 turn switch */
  useEffect(() => {
    const onTurnSwitch = (data) => {
      console.log("🔁 Turn switched:", data);
      setGameState((prev) => ({ ...prev, currentTurn: data.nextTurn }));
      if (data.round !== undefined) {
        setRounds(data.round);
        console.log(`📦 Updated Round from server: ${data.round}`);
      }
      setIsMyTurn(data.nextTurn === nickname);
      setRunning(false);
    };
    socket.on("turnSwitch", onTurnSwitch);
    return () => socket.off("turnSwitch", onTurnSwitch);
  }, [nickname]);

  /* 🕒 Global ticking (client-side rendering of remaining time) */
  useEffect(() => {
    if (!running || baseTime === null) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - baseTime) / 1000);
      const remaining = Math.max((mode === "hard" ? 30 : 60) - elapsed, 0);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current);
        setRunning(false);
        setResultPopup("timeout");
        playSound("timeout");

        socket.emit("answerResult", {
          nickname,
          result: "timeout",
          correct: false,
          score,
          round: rounds + 1,
          mode,
        });

        // Auto resume countdown
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, baseTime, mode]);

  /* ✅ CHECK ANSWER */
  const checkAnswer = () => {
    try {
      const expr = expression.trim();

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

      // start auto-resume countdown
      let count = 3;
      setAutoResumeCount(count);

      const timer = setInterval(() => {
        count -= 1;
        setAutoResumeCount(count);
        if (count <= 0) {
          clearInterval(timer);
          setAutoResumeCount(null);
          setResultPopup(null);
          socket.emit("resumeGame", { mode });
          setIsMyTurn(false);
        }
      }, 1000);
    } catch (err) {
      console.error("❌ Expression error:", err);
      setResultPopup("invalid");
    }
  };

  /* 🧠 findSolution (kept as helper) */
  const findSolution = (digitsArr, targetVal, disabledOpsArr = []) => {
    const ops = ["+", "-", "*", "/"].filter(
      (op) => !disabledOpsArr.includes(op === "*" ? "×" : op === "/" ? "÷" : op)
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

  /* ✨ Transition presets */
  const fade = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  const currentTheme = themes[theme];

  /* 🧩 SOCKET.IO CLIENT CONNECTION & HANDLERS */
  useEffect(() => {
    if (!socket) return;

    // connect
    const onConnect = () => {
      console.log("🟢 Connected to server");
      if (page === "mode" && nickname.trim()) {
        socket.emit("setNickname", nickname);
        console.log(`✅ ${nickname} marked as online`);
      }
      // ask for leaderboard on connect
      socket.emit("getLeaderboard");
    };
    socket.on("connect", onConnect);

    // player list
    const onPlayerList = (list) => {
      console.log("👥 Players online:", list);
      setPlayerList(list);
    };
    socket.on("playerList", onPlayerList);

    // waiting list
    const onWaitingList = (data) => {
      if (data.mode === mode) {
        console.log(`🕹️ Waiting list for ${mode}:`, data.players);
        setWaitingPlayers(data.players);
      }
    };
    socket.on("waitingList", onWaitingList);

    // canStart
    const onCanStart = (data) => {
      if (data.mode === mode) setCanStart(data.canStart);
    };
    socket.on("canStart", onCanStart);

    // preGameStart
    const onPreGameStart = (data) => {
      console.log("⏳ Pre-game starting:", data);
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
    };
    socket.on("preGameStart", onPreGameStart);

    // gameStart
    const onGameStart = (data) => {
      console.log("🚀 Game started from server:", data);

      setDigits(data.digits || []);
      setOperators(data.operators || []);
      setDisabledOps(data.disabledOps || []);
      setTarget(data.target || 0);
      setMode(data.mode || "easy");

      setGameState(data);
      const myTurn = data.currentTurn === nickname;
      setIsMyTurn(myTurn);
      setPage("game");

      if (myTurn) {
        setRunning(true);
        setTimeLeft(data.mode === "hard" ? 30 : 60);
        setBaseTime(Date.now());
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
    };
    socket.on("gameStart", onGameStart);

    // newRound
    const onNewRound = (data) => {
      console.log("🧩 Received new round problem:", data);
      setDigits(data.digits);
      setOperators(data.operators);
      setDisabledOps(data.disabledOps);
      setTarget(data.target);
      setRounds(data.round);
      setExpression("");
      setLastWasNumber(false);
      setResultPopup(null);
    };
    socket.on("newRound", onNewRound);

    // gameover
    const onGameOver = (data) => {
      console.log("💀 Game over:", data);
      setResultPopup("gameover");
      stopTimer();
      setRunning(false);
    };
    socket.on("gameover", onGameOver);

    // answerResult - show updates from others
    const onAnswerResult = (data) => {
      console.log("📩 Answer result:", data);
      if (data.nickname === nickname) return;
      if (data.correct) {
        console.log(`✅ ${data.nickname} answered correctly!`);
      } else {
        console.log(`❌ ${data.nickname} answered wrong.`);
      }
    };
    socket.on("answerResult", onAnswerResult);

    // playerLeft
    const onPlayerLeft = (data) => {
      console.log(`🚪 ${data.nickname} left ${data.mode}`);
      if (data.mode === mode) {
        setWaitingPlayers((prev) => prev.filter((p) => p !== data.nickname));
      }
    };
    socket.on("playerLeft", onPlayerLeft);

    // leaderboard updates
    const onLeaderboardUpdate = (data) => {
      console.log("🏆 Leaderboard update:", data);
      setLeaderboard(data || []);
    };
    socket.on("leaderboardUpdate", onLeaderboardUpdate);

    // getLeaderboard response if server echoes back (redundant but safe)
    socket.on("getLeaderboard", () => {
      socket.emit("getLeaderboard");
    });

    // cleanup
    return () => {
      socket.off("connect", onConnect);
      socket.off("playerList", onPlayerList);
      socket.off("waitingList", onWaitingList);
      socket.off("canStart", onCanStart);
      socket.off("preGameStart", onPreGameStart);
      socket.off("gameStart", onGameStart);
      socket.off("newRound", onNewRound);
      socket.off("turnSwitch");
      socket.off("gameover", onGameOver);
      socket.off("answerResult", onAnswerResult);
      socket.off("playerLeft", onPlayerLeft);
      socket.off("leaderboardUpdate", onLeaderboardUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nickname, page, mode]);

  /* -------------------
     MAIN UI
  --------------------*/
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
            onClick={() => setDropdownOpen(dropdownOpen === "lang" ? null : "lang")}
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
            onClick={() => setDropdownOpen(dropdownOpen === "theme" ? null : "theme")}
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
            onClick={() => setDropdownOpen(dropdownOpen === "volume" ? null : "volume")}
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

        {/* 🏆 Leaderboard button */}
        <div className="leaderboard-btn">
          <button
            className="control-btn"
            onClick={() => {
              playSound("click");
              setPage("leaderboard");
              // request fresh data
              socket.emit("getLeaderboard");
            }}
            title="Leaderboard"
          >
            <FaTrophy />
          </button>
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

              const activeMode = gameState?.mode || mode;

              socket.emit("playerLeftGame", {
                nickname,
                mode: activeMode,
              });

              setRunning(false);
              setIsMyTurn(false);
              setPage("mode");
            } else if (page === "waiting" || page === "mode") {
              socket.emit("leaveLobby", nickname);
              socket.disconnect();
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
                  {lang === "th" ? "ไม่มีผู้เล่นออนไลน์" : lang === "zh" ? "暂无在线玩家" : "No players online"}
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
                  {lang === "th" ? "ยังไม่มีผู้เล่นในห้องนี้" : lang === "zh" ? "该房间暂无玩家" : "No players yet"}
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
                socket.emit("leaveGame", { nickname, mode });
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
              {lang === "th" ? `${preGameInfo.starter} เริ่มเกม!` : lang === "zh" ? `${preGameInfo.starter} 开始了游戏！` : `${preGameInfo.starter} started the game!`}
            </h2>
            <h1 className="countdown-number">{countdown}</h1>
          </motion.div>
        )}

        {/* GAME PAGE */}
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
                  <h3 className="turn-status">⏳ Waiting for <span className="highlight">{gameState?.currentTurn}</span>...</h3>
                  <h1 className={`waiting-time ${timeLeft <= 10 ? "time-critical" : ""}`}>{timeLeft > 0 ? `${timeLeft}s` : "00s"}</h1>
                </div>
              )}
            </div>

            {!isMyTurn ? (
              <div className="waiting-turn glass-card">
                <h2 className="waiting-title">⏳ Waiting for <span className="highlight">{gameState?.currentTurn}</span>...</h2>
                <div className="waiting-timer">
                  <h1 className={`time-left ${timeLeft <= 10 ? "time-critical" : ""}`}>{timeLeft > 0 ? `${timeLeft}s` : "00s"}</h1>
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
                  {operators.map((op) => (
                    <button
                      key={op}
                      disabled={disabledOps.includes(op) || !lastWasNumber}
                      className={`op-btn ${disabledOps.includes(op) ? "disabled" : ""}`}
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
              <motion.div className={`popup ${resultPopup === "invalid" ? "invalid" : ""}`} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 120 }}>
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
                {resultPopup === "gameover" && (
                  <>
                    <h2>💀 Game Over</h2>
                    <p className="solution-text">Not enough players to continue.</p>
                  </>
                )}

                {autoResumeCount !== null && <p className="resume-count">Resuming next turn in <span className="highlight">{autoResumeCount}</span>s...</p>}

                {autoResumeCount === null && (
                  <div className="popup-btns">
                    <button onClick={() => { playSound("click"); startGame(mode); }}>
                      <FaRedo /> {T.playAgain}
                    </button>
                    <button onClick={() => { playSound("click"); stopTimer(); setPage("stats"); }}>
                      <FaSignOutAlt /> {T.exit}
                    </button>
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

        {/* STATS PAGE */}
        {page === "stats" && (
          <motion.div key="stats" {...fade} className="stats-page">
            <div className="stats-card">
              <h2 className="stats-title">{T.stats}</h2>
              <p className="player-summary">{T.playerName}: <strong>{nickname}</strong></p>
              <p>{T.score}: <strong>{score}</strong></p>
              <p>{T.rounds}: <strong>{rounds}</strong></p>

              <div className="history">
                <h3>{T.history}</h3>
                <ul>
                  {history.map((h, i) => <li key={i}>Round {h.round}: {h.ok ? "✅" : "❌"} ({h.result})</li>)}
                </ul>
              </div>

              <div className="stats-actions">
                <button className="main-btn" onClick={() => { playSound("click"); setPage("mode"); }}>
                  <FaArrowLeft /> {T.back}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* LEADERBOARD PAGE */}
        {page === "leaderboard" && (
          <motion.div key="leaderboard" {...fade} className="leaderboard-page">
            <div className="glass-card leaderboard-card">
              <h2 className="leaderboard-title">🏆 Leaderboard</h2>
              <p className="leaderboard-sub">Top players (session)</p>

              <ol className="leaderboard-list">
                {leaderboard && leaderboard.length ? (
                  leaderboard.map((p, i) => (
                    <li key={p.nickname} className={p.nickname === nickname ? "self" : ""}>
                      <span className="rank">#{i + 1}</span>
                      <span className="name">{p.nickname}</span>
                      <span className="points">{p.points ?? 0} pts</span>
                      <span className="wins">{p.wins ?? 0}✔</span>
                    </li>
                  ))
                ) : (
                  <p>No leaderboard data yet.</p>
                )}
              </ol>

              <div className="stats-actions">
                <button className="main-btn" onClick={() => { playSound("click"); setPage("mode"); }}>
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
