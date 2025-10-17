/* =============================================================
 🧩 IQ180 React App (Production-ready Clean Code)
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

// Use env or fallback to localhost in dev
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";
// Create a single socket instance
const socket = io(SERVER_URL, { autoConnect: true });

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

  const [resultPopup, setResultPopup] = useState(null);
  const [history, setHistory] = useState([]);
  const [lastWasNumber, setLastWasNumber] = useState(false);
  const [lastWasSqrt, setLastWasSqrt] = useState(false);
  const [solutionExpr] = useState("");

  /* 👥 Multiplayer & Room State */
  const [playerList, setPlayerList] = useState([]);
  const [canStart, setCanStart] = useState(false);
  const [preGameInfo, setPreGameInfo] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [gameState, setGameState] = useState({});
  const [isMyTurn, setIsMyTurn] = useState(false);

  const [autoResumeCount, setAutoResumeCount] = useState(null);

  /* 🕒 TIMER (host-synced) */
  const [baseTime, setBaseTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [running, setRunning] = useState(false);
  const timerRef = useRef(null);

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
  };

  /* ⛓️ SOCKET BINDINGS */
  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      console.log("🟢 Connected to server:", SERVER_URL);
      if (page === "mode" && nickname.trim()) {
        socket.emit("setNickname", nickname);
      }
    };

    const onPlayerList = (list) => setPlayerList(list);
    const onWaitingList = (data) => {
      if (data.mode === mode) setWaitingPlayers(data.players);
    };
    const onCanStart = (data) => {
      if (data.mode === mode) setCanStart(data.canStart);
    };

    const onPreGameStart = (data) => {
      setPreGameInfo({
        mode: data.mode,
        starter: data.starter,
        players: data.players,
      });
      let counter = data.countdown;
      setCountdown(counter);
      const t = setInterval(() => {
        counter -= 1;
        setCountdown(counter);
        if (counter <= 0) clearInterval(t);
      }, 1000);
    };

    const onGameStart = (data) => {
      // Server provides the first round’s problem
      setDigits(data.digits || []);
      setOperators(data.operators || []);
      setDisabledOps(data.disabledOps || []);
      setTarget(data.target || 0);
      setMode(data.mode || "easy");
      setGameState(data);

      const myTurn = data.currentTurn === nickname;
      setIsMyTurn(myTurn);
      setPage("game");

      const roundTime = data.mode === "hard" ? 30 : 60;
      setTimeLeft(roundTime);
      setRunning(myTurn); // only the active player runs their local UI animations; the actual time is host-synced
      setExpression("");
      setLastWasNumber(false);
      setLastWasSqrt(false);
      setResultPopup(null);
      setScore(0);
      setRounds(0);
    };

    const onTurnSwitch = (data) => {
      setGameState((prev) => ({ ...prev, currentTurn: data.nextTurn }));
      if (data.round !== undefined) setRounds(data.round);
      setIsMyTurn(data.nextTurn === nickname);
      setRunning(false); // wait for syncTimer to restart time
    };

    const onSyncTimer = ({ mode: syncMode, startTime }) => {
      // Use the host’s start time
      setBaseTime(startTime);
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const roundTime = (syncMode === "hard" ? 30 : 60) - elapsed;
      setTimeLeft(Math.max(roundTime, 0));
      setRunning(true);
    };

    const onYourTurn = ({ mode: myMode }) => {
      console.log("🎯 Your turn");
      setIsMyTurn(true);
      setRunning(true);
      // Problem is controlled server-side per round. No client generation.
    };

    const onAnswerResult = (data) => {
      if (data.nickname === nickname) return;
      console.log(
        data.correct
          ? `✅ ${data.nickname} answered correctly`
          : `❌ ${data.nickname} answered wrong`
      );
    };

    const onGameOver = () => {
      setResultPopup("gameover");
      stopTimer();
    };

    const onPlayerLeft = (data) => {
      if (data.mode === mode) {
        setWaitingPlayers((prev) => prev.filter((p) => p !== data.nickname));
      }
    };

    socket.on("connect", onConnect);
    socket.on("playerList", onPlayerList);
    socket.on("waitingList", onWaitingList);
    socket.on("canStart", onCanStart);
    socket.on("preGameStart", onPreGameStart);
    socket.on("gameStart", onGameStart);
    socket.on("turnSwitch", onTurnSwitch);
    socket.on("syncTimer", onSyncTimer);
    socket.on("yourTurn", onYourTurn);
    socket.on("answerResult", onAnswerResult);
    socket.on("gameover", onGameOver);
    socket.on("playerLeft", onPlayerLeft);

    return () => {
      socket.off("connect", onConnect);
      socket.off("playerList", onPlayerList);
      socket.off("waitingList", onWaitingList);
      socket.off("canStart", onCanStart);
      socket.off("preGameStart", onPreGameStart);
      socket.off("gameStart", onGameStart);
      socket.off("turnSwitch", onTurnSwitch);
      socket.off("syncTimer", onSyncTimer);
      socket.off("yourTurn", onYourTurn);
      socket.off("answerResult", onAnswerResult);
      socket.off("gameover", onGameOver);
      socket.off("playerLeft", onPlayerLeft);
    };
  }, [nickname, page, mode]);

  /* ⏱️ Host-synced time ticker */
  useEffect(() => {
    if (!running || baseTime === null) return;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - baseTime) / 1000);
      const roundTime = mode === "hard" ? 30 : 60;
      const remaining = Math.max(roundTime - elapsed, 0);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        stopTimer();
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

        // Auto resume to next turn
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
    return () => clearInterval(timerRef.current);
  }, [running, baseTime, mode, nickname, rounds]);

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

      // eslint-disable-next-line no-eval
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

      // Auto-advance after 3s
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
    } catch (err) {
      console.error("❌ Expression error:", err);
      setResultPopup("invalid");
    }
  };

  /* ✨ Animations */
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
      style={{ background: currentTheme.background, color: currentTheme.text }}
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

      {/* 🔙 Back Button */}
      {page !== "login" && (
        <button
          className="back-btn"
          onClick={() => {
            playSound("click");

            if (page === "game") {
              stopTimer();
              const activeMode = gameState?.mode || mode;
              socket.emit("playerLeftGame", { nickname, mode: activeMode });
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

        {/* MODE PAGE ------------------------------------------------ */}
        {page === "mode" && (
          <motion.div key="mode" className="mode-page" {...fade}>
            <h2 className="big-player">
              {T.playerName}: <span>{nickname}</span>
            </h2>

            <div className="online-box glass-card">
              <h3 className="online-title">👥 {lang === "th" ? "ผู้เล่นที่ออนไลน์" : lang === "zh" ? "在线玩家" : "Players Online"}</h3>
              {playerList && playerList.length > 0 ? (
                <ul className="online-list">
                  {playerList.map((p, i) => (
                    <li key={i} className={p === nickname ? "self" : ""}>
                      {p === nickname ? (
                        <span className="you-label">{lang === "th" ? "คุณ" : lang === "zh" ? "你" : "You"}</span>
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
              <span className="highlight">{mode === "easy" ? T.easy : T.hard}</span>
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
                  {lang === "th" ? "ยังไม่มีผู้เล่นในห้องนี้" : lang === "zh" ? "该房间暂无玩家" : "No players yet"}
                </p>
              )}
            </div>

            {waitingPlayers.length > 1 && (
              <button
                className="main-btn"
                onClick={() => socket.emit("startGame", { mode, nickname })}
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
            <div className="game-header">
              <h2 className="big-player">
                {T.playerName}: <span>{nickname}</span>
              </h2>

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
                    onClick={checkAnswer}
                    disabled={digits.some((d) => !expression.includes(String(d)))}
                  >
                    {T.submit}
                  </button>
                </div>
              </>
            )}

            {/* 🧩 POPUP SYSTEM */}
            {resultPopup && resultPopup !== "endRound" && (
              <motion.div
                className={`popup ${resultPopup === "invalid" ? "invalid" : ""}`}
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
                      💡 {T.solution}:<br />
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

                {autoResumeCount !== null && (
                  <p className="resume-count">
                    Resuming next turn in <span className="highlight">{autoResumeCount}</span>s...
                  </p>
                )}

                {autoResumeCount === null && (
                  <div className="popup-btns">
                    <button
                      onClick={() => {
                        // continue the match; server will rotate to next player or next round
                        socket.emit("resumeGame", { mode });
                        setResultPopup(null);
                      }}
                    >
                      <FaRedo /> {T.playAgain}
                    </button>
                    <button
                      onClick={() => {
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

        {/* END-ROUND POPUP (kept for compatibility if server uses it) */}
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
                  socket.emit("resumeGame", { mode });
                  setResultPopup(null);
                }}
              >
                <FaRedo /> {T.playAgain}
              </button>
              <button
                onClick={() => {
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
