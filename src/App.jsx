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

import { texts, getTexts } from "./config/texts";
import { themes, getTheme } from "./config/themes";

import useGameSocket from "./hooks/useGameSocket";
import useGameTimer from "./hooks/useGameTimer";

import useSound from "./hooks/useSound";
import LanguageDropdown from "./components/controls/LanguageDropdown";
import ThemeDropdown from "./components/controls/ThemeDropdown";
import VolumeDropdown from "./components/controls/VolumeDropdown";

import LoginPage from "./components/LoginPage";
import IntroPage from "./components/IntroPage"
import ModePage from "./pages/ModePage"
import WaitingPage from "./pages/WaitingPage";
import GamePage from "./pages/GamePage";

import { handleCheckAnswer } from "./utils/checkAnswer";

import { io } from "socket.io-client";
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";
const socket = io(SERVER_URL, { autoConnect: true, transports: ["websocket", "polling"] });
//ถ้าเปลี่ยน router แม้ใช้ wifi ชื่อเดียวกัน ก็ต้องใส่ ip ใหม่
// เข้า Terminal เครื่อง แล้วพิมพ์:
// "ipconfig" (Window)
// "ifconfig | grep inet" (Mac)
// แล้วหา 	inet 10.201.213.149 netmask 0xffff8000 


export default function App() {
  const [lang, setLang] = useState("en");
  const T = getTexts(lang);

  /* 🎨 THEMES */
  const [theme, setTheme] = useState("galaxyBlue");
  const [dropdownOpen, setDropdownOpen] = useState(null);

  // pick current theme (object)
  const currentTheme = getTheme(theme);
  // 🧩 Multiplayer waiting room
  const [waitingPlayers, setWaitingPlayers] = useState([]);

  /* 🔊 SOUND ENGINE */
// replace existing sound state with hook:
const { play, muted, volume, setVolume, toggleMute } = useSound({ initialVolume: 0.4 });

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

// ===== MISSING STATE (restore from original) =====
const [scores, setScores] = useState({});

// ===== MISSING startGame helper used by popup's "Play Again" button =====
function startGame(modeName) {
  // if you want host behavior or client triggered start:
  if (!socket || !socket.connected) return;
  socket.emit("startGame", { mode: modeName || mode, nickname });
}

/* ======= EMOJI / REACTIONS ======= */
const [reactions, setReactions] = useState({}); // { nickname: { emoji, ts } }
const [latestEmojiPopup, setLatestEmojiPopup] = useState(null); // { emoji, from }
const emojiTimeoutsRef = useRef({});

const sendEmoji = (emoji) => {
  try { play("click"); } catch {}
  if (!nickname) return;
  const payload = { nickname, emoji, ts: Date.now() };
  // local echo
  setReactions((prev) => ({ ...prev, [nickname]: { emoji, ts: payload.ts } }));
  setLatestEmojiPopup({ emoji, from: nickname });
  setTimeout(() => setLatestEmojiPopup(null), 1600);
  // auto-clear local after 5s
  if (emojiTimeoutsRef.current[nickname]) clearTimeout(emojiTimeoutsRef.current[nickname]);
  emojiTimeoutsRef.current[nickname] = setTimeout(() => {
    setReactions((prev) => {
      const next = { ...prev };
      delete next[nickname];
      return next;
    });
    delete emojiTimeoutsRef.current[nickname];
  }, 5000);

  if (socket && socket.connected) socket.emit("playerEmoji", payload);
};

/* 🕒 TIMER (Client-side synced with Player 1, global for all players) */
const [baseTime, setBaseTime] = useState(null);
const [timeLeft, setTimeLeft] = useState(60);
const [running, setRunning] = useState(false);


const stopTimer = () => {
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
};

const socket = useGameSocket({
  nickname,
  mode,
  page,
  play,
  setPage,
  setPlayerList,
  setWaitingPlayers,
  setCanStart,
  setPreGameInfo,
  setCountdown,
  setShowCountdown,
  setDigits,
  setOperators,
  setDisabledOps,
  setTarget,
  setMode,
  setSolutionExpr,
  setGameState,
  setIsMyTurn,
  setRunning,
  setTimeLeft,
  setExpression,
  setLastWasNumber,
  setLastWasSqrt,
  setResultPopup,
  setSolution,
  setScore,
  setRounds,
  setScores,
  setEndByName,
  setReactions,
  setLatestEmojiPopup,
  emojiTimeoutsRef,
  problemRef,
});

/* 🕒 Global tick effect */
const timerRef = useGameTimer({
  running,
  baseTime,
  duration: 60, // or mode === "hard" ? 30 : 60 if you prefer dynamic
  play,
  problemRef,
  nickname,
  score,
  rounds,
  mode,
  isMyTurn,
  socket,
  setRunning,
  setResultPopup,
  setSolutionExpr,
  setAutoResumeCount,
  setIsMyTurn,
});

/* ✅ CHECK ANSWER (Smart Validation) */
const checkAnswer = () => {
  handleCheckAnswer({
    expression,
    digits,
    target,
    disabledOps,
    play,
    setResultPopup,
    setScore,
    setSolutionExpr,
    setHistory,
    rounds,
    nickname,
    mode,
    score,
    socket,
    setAutoResumeCount,
    isMyTurn,
    setIsMyTurn,
  });
};

// 👑 HOST CHECK (คงไว้เสมอ เผื่อ JSX ใช้)
const isHost = gameState?.turnOrder?.[0] === nickname;

// 🧨 END GAME FOR ALL (ทุกคนเห็น Game Over popup)
const endGameForAll = () => {
  // กันกดซ้ำ/กันยิงซ้ำขณะอยู่ popup อยู่แล้ว
  if (resultPopup === "gameover") return;

  try {
    play("click");
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
    play("click");
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

/* ✨ Transition presets */
const fade = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

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
      {/* center popup for latest emoji */}
      {latestEmojiPopup && (
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ duration: 0.28 }}
          style={{
            position: "fixed",
            left: "50%",
            top: "36%",
            transform: "translateX(-50%)",
            zIndex: 60,
            pointerEvents: "none",
            textAlign: "center",
            background: "rgba(0,0,0,0.35)",
            padding: "12px 18px",
            borderRadius: 12,
          }}
        >
          <div style={{ fontSize: 44 }}>{latestEmojiPopup.emoji}</div>
          <div style={{ fontSize: 12, marginTop: 6, opacity: 0.85 }}>
            {latestEmojiPopup.from}
          </div>
        </motion.div>
      )}

      {/* 🌍 TOP CONTROLS */}
      <div className="top-controls">
        <LanguageDropdown
          dropdownOpen={dropdownOpen}
          setDropdownOpen={setDropdownOpen}
          texts={texts}
          lang={lang}
          setLang={setLang}
        />

        <ThemeDropdown
          dropdownOpen={dropdownOpen}
          setDropdownOpen={setDropdownOpen}
          themes={themes}
          theme={theme}
          setTheme={setTheme}
        />

        <VolumeDropdown
          dropdownOpen={dropdownOpen}
          setDropdownOpen={setDropdownOpen}
          volume={volume}
          muted={muted}
          setVolume={setVolume}
          toggleMute={toggleMute}
        />
      </div>
      
      {/* 🔙 Back Button */}
      {page !== "login" && (
        <button
          className="back-btn"
          onClick={() => {
            play("click");

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
          <LoginPage
            T={T}
            nickname={nickname}
            setNickname={setNickname}
            play={play}
            socket={socket}
            setPage={setPage}
            fade={fade}
          />
        )}

        {/* INTRO PAGE (integrated) ------------------------------------------------ */}
        {page === "intro" && (
          <IntroPage
            T={T}
            nickname={nickname}
            lang={lang}
            play={play}
            setPage={setPage}
            fade={fade}
          />
        )}

{/* MODE PAGE ------------------------------------------------ */}
{page === "mode" && (
  <ModePage
    T={T}
    lang={lang}
    nickname={nickname}
    reactions={reactions}
    playerList={playerList}
    play={play}
    socket={socket}
    setMode={setMode}
    setPage={setPage}
    fade={fade}
  />
)}

{/* WAITING ROOM PAGE ------------------------------------------------ */}
{page === "waiting" && (
  <WaitingPage
    T={T}
    lang={lang}
    mode={mode}
    nickname={nickname}
    waitingPlayers={waitingPlayers}
    reactions={reactions}
    play={play}
    socket={socket}
    setPage={setPage}
    fade={fade}
  />
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
  <GamePage
    T={T}
    lang={lang}
    nickname={nickname}
    reactions={reactions}
    dropdownOpen={dropdownOpen}
    setDropdownOpen={setDropdownOpen}
    isHost={isHost}
    isMyTurn={isMyTurn}
    endGameForAll={endGameForAll}
    leaveGame={leaveGame}
    sendEmoji={sendEmoji}
    gameState={gameState}
    rounds={rounds}
    timeLeft={timeLeft}
    score={score}
    digits={digits}
    operators={operators}
    disabledOps={disabledOps}
    expression={expression}
    lastWasNumber={lastWasNumber}
    lastWasSqrt={lastWasSqrt}
    solutionExpr={solutionExpr}
    resultPopup={resultPopup}
    endByName={endByName}
    autoResumeCount={autoResumeCount}
    play={play}
    setExpression={setExpression}
    setLastWasNumber={setLastWasNumber}
    setLastWasSqrt={setLastWasSqrt}
    stopTimer={stopTimer}
    startGame={startGame}
    setPage={setPage}
    checkAnswer={checkAnswer}
    fade={fade}
  />
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
          play("click");
          socket.emit("resumeGame", { mode });
          setResultPopup(null);
        }}
      >
        <FaRedo /> {T.playAgain}
      </button>
      <button
        onClick={() => {
          play("click");
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
                        {reactions[name] && <span style={{ marginLeft: 8 }}>{reactions[name].emoji}</span>}
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
            play("click");
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
