// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TopControls from "./components/TopControls";
import BackButton from "./components/BackButton";
import LoginPage from "./pages/LoginPage";
import ModePage from "./pages/ModePage";
import WaitingPage from "./pages/WaitingPage";
import GamePage from "./pages/GamePage";
import StatsPage from "./pages/StatsPage";
import Popups from "./components/Popups";
import useSocket from "./hooks/useSocket";
import { generateProblem, findSolution } from "./utils/gameUtils";
import { bgm, playSound } from "./utils/sounds";
import "./App.css";

/* texts & themes (kept from your original) */
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
    invalidExpr: "Invalid Expression. Each number must be followed by an operator.",
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
    invalidExpr: "รูปแบบสมการไม่ถูกต้อง ต้องมีเครื่องหมายคั่นระหว่างเลข",
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

const themes = {
  galaxyBlue: { name: "Galaxy Neon Blue", background: "radial-gradient(circle at 20% 30%, #001133, #000000 70%)", accent: "#00bfff", text: "#eaf6ff" },
  galaxyPink: { name: "Cyber Neon Pink", background: "radial-gradient(circle at 80% 20%, #2a001f, #000000 80%)", accent: "#ff00a6", text: "#ffe6ff" },
  auroraEmerald: { name: "Aurora Emerald", background: "linear-gradient(135deg, #003333, #006644, #001122)", accent: "#00ffcc", text: "#eafff4" },
  crimsonInferno: { name: "Crimson Inferno", background: "linear-gradient(135deg, #2b0000, #660000, #330000)", accent: "#ff4444", text: "#ffe5e5" },
};

export default function App() {
  // UI / audio
  const [lang, setLang] = useState("en");
  const T = texts[lang];
  const [theme, setTheme] = useState("galaxyBlue");
  const currentTheme = themes[theme];
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.4);

  // socket hook (keeps single socket connection)
  const { socketRef, emit } = useSocket({ url: "http://192.168.1.116:4000" });

  // game state (adjusted per your requested changes)
  const [page, setPage] = useState("login");
  const [nickname, setNickname] = useState("");
  const [mode, setMode] = useState("easy");
  const [score, setScore] = useState(0);
  const [rounds, setRounds] = useState(1); // initial round 1 as requested
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [digits, setDigits] = useState([]);
  const [operators, setOperators] = useState([]);
  const [disabledOps, setDisabledOps] = useState([]);
  const [target, setTarget] = useState(0);
  const [expression, setExpression] = useState("");
  const [lastWasNumber, setLastWasNumber] = useState(false);
  const [lastWasSqrt, setLastWasSqrt] = useState(false);
  const [solutionExpr, setSolutionExpr] = useState("");
  const [resultPopup, setResultPopup] = useState(null);
  const [solution, setSolution] = useState(null);
  const [history, setHistory] = useState([]);

  // multiplayer / room
  const [waitingPlayers, setWaitingPlayers] = useState([]);
  const [playerList, setPlayerList] = useState([]);
  const [canStart, setCanStart] = useState(false);
  const [preGameInfo, setPreGameInfo] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [showCountdown, setShowCountdown] = useState(false);
  const [gameState, setGameState] = useState({});
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [currentTurn, setCurrentTurn] = useState(null);

  // timer & auto resume
  const [autoResumeCount, setAutoResumeCount] = useState(null);
  const [baseTime, setBaseTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [running, setRunning] = useState(false);
  const timerRef = useRef(null);

  // store latest problem to compute solution on timeout
  const problemRef = useRef({ digits: [], target: 0, disabledOps: [] });

  /* audio side-effect */
  useEffect(() => {
    try {
      bgm.volume(volume);
      if (volume === 0) setMuted(true);
      if (!muted && !bgm.playing()) bgm.play();
      if (muted) bgm.pause();
    } catch (err) {
      // ignore if bgm not ready
      // console.warn("bgm error", err);
    }
  }, [muted, volume]);

  const toggleMute = () => {
    if (muted) {
      setMuted(false);
      setVolume(0.4);
      try { bgm.play(); } catch {}
    } else {
      setMuted(true);
      setVolume(0);
      try { bgm.pause(); } catch {}
    }
  };

  /* ========== socket listeners: attach when socketRef available ========== */
  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;

    // global player list
    s.on("playerList", (list) => setPlayerList(list));

    // waiting room list (per-mode)
    s.on("waitingList", (data) => {
      if (data?.mode === mode) {
        setWaitingPlayers(data.players || []);
        setTotalPlayers((data.players || []).length);
      }
    });

    // canStart event
    s.on("canStart", (data) => { if (data?.mode === mode) setCanStart(!!data.canStart); });

    // pre-game countdown
    s.on("preGameStart", (data) => {
      setPreGameInfo({ mode: data.mode, starter: data.starter, players: data.players });
      let counter = data.countdown || 3;
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
    });

    // game start
    s.on("gameStart", (data) => {
      console.log("🚀 Game started from server:", data);
      setDigits(data.digits || []);
      setOperators(data.operators || []);
      setDisabledOps(data.disabledOps || []);
      setTarget(data.target || 0);
      setMode(data.mode || "easy");

      // store latest problem for timeouts
      problemRef.current = {
        digits: data.digits || [],
        target: data.target || 0,
        disabledOps: data.disabledOps || [],
      };
      setSolutionExpr(""); // clear previous

      // scoreboard init
      const list = Array.isArray(data.players) && data.players.length > 0 ? data.players : (Array.isArray(data.turnOrder) ? data.turnOrder : []);
      const uniquePlayers = Array.from(new Set([...list, nickname].filter(Boolean)));
      // set initial scores (component StatsPage reads from scores via other prop; here you can adapt to your state shape)
      // (You may already have a score-store; I'll keep setScore to 0)
      setGameState(data);
      const myTurn = data.currentTurn === nickname;
      setIsMyTurn(myTurn);
      setCurrentTurn(data.currentTurn || null);

      // enter game page
      setPage("game");

      // start/stop timer depending on whether it's our turn
      if (myTurn) {
        setRunning(true);
        setTimeLeft(data.mode === "hard" ? 30 : 60);
      } else {
        setRunning(false);
        setTimeLeft(data.mode === "hard" ? 30 : 60);
      }

      // reset per-turn UI state
      setExpression("");
      setLastWasNumber(false);
      setLastWasSqrt(false);
      setResultPopup(null);
      setSolution(null);
      setScore(0);
      setRounds(data.round || 1);
      console.log("🎯 Current turn:", data.currentTurn);
    });

    // new round payload
    s.on("newRound", (data) => {
      console.log("🧩 Received new round problem:", data);
      setDigits(data.digits || []);
      setOperators(data.operators || []);
      setDisabledOps(data.disabledOps || []);
      setTarget(data.target || 0);
      setRounds(data.round || (rounds + 1));
      setExpression("");
      setLastWasNumber(false);
      setResultPopup(null);
      problemRef.current = { digits: data.digits || [], target: data.target || 0, disabledOps: data.disabledOps || [] };
      setSolutionExpr("");
    });

    // turn switch (server now emits nextTurn, currentTurnIndex, round)
    s.on("turnSwitch", ({ nextTurn, currentTurnIndex, round }) => {
      console.log("🔁 Turn switched:", nextTurn, "Round:", round);
      setGameState((prev) => ({ ...prev, currentTurn: nextTurn, currentTurnIndex }));
      setCurrentTurn(nextTurn || null);
      if (typeof round === "number") setRounds(round);
      setIsMyTurn(nextTurn === nickname);
      setRunning(false);
    });

    // sync timer from host
    s.on("syncTimer", ({ mode: m, startTime }) => {
      console.log(`🕛 Synced timer from host: ${new Date(startTime).toLocaleTimeString()}`);
      setBaseTime(startTime);
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remain = Math.max(60 - elapsed, 0);
      setTimeLeft(remain);
      setRunning(true);
    });

    // when server tells us it's our turn
    s.on("yourTurn", ({ mode: m }) => {
      console.log("🎯 yourTurn event received (client-side):", m);

      // If it's the first round and we already have digits from server, keep them
      if (rounds === 1 && digits.length > 0) {
        console.log("🧩 First turn — using server-provided problem");
      } else {
        // otherwise create a problem locally (server-driven games may override)
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
      }

      // set up turn state
      const now = Date.now();
      setBaseTime(now);
      setTimeLeft(60);
      setRunning(true);
      setIsMyTurn(true);

      // If we're host (turnOrder[0]) and rounds > 1, emit syncTimer to server (server may already handle sync)
      if (gameState?.turnOrder?.[0] === nickname && rounds > 1) {
        const startTime = Date.now();
        socketRef.current?.emit("syncTimer", { mode: m, startTime });
        console.log("🕒 Host started global timer:", new Date(startTime).toLocaleTimeString());
      }

      // ensure UI reset
      setExpression("");
      setLastWasNumber(false);
      setLastWasSqrt(false);
      setResultPopup(null);
      setSolution(null);
      setPage("game");
    });

    // answerResult updates (scoreboard syncing)
    s.on("answerResult", (data) => {
      console.log("📩 Answer result:", data);
      // update any score store if you have it: example pattern:
      // setScores(prev => { ... })
      // sync round if provided
      if (data?.round !== undefined) setRounds(data.round);
      // optionally show who answered (we won't force a popup)
      if (data.nickname !== nickname) {
        if (data.correct) console.log(`✅ ${data.nickname} answered correctly!`);
        else console.log(`❌ ${data.nickname} answered wrong.`);
      }
    });

    // player left
    s.on("playerLeft", (data) => {
      if (data?.mode === mode) setWaitingPlayers((prev) => prev.filter((p) => p !== data.nickname));
    });

    // gameover
    s.on("gameover", (data) => {
      console.log("💀 Game over:", data);
      setResultPopup("gameover");
      stopTimer();
      setRunning(false);
    });

    // cleanup when socketRef changes / component unmount
    return () => {
      s.off("playerList");
      s.off("waitingList");
      s.off("canStart");
      s.off("preGameStart");
      s.off("gameStart");
      s.off("newRound");
      s.off("turnSwitch");
      s.off("syncTimer");
      s.off("yourTurn");
      s.off("answerResult");
      s.off("playerLeft");
      s.off("gameover");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketRef.current, nickname, mode, rounds, digits, gameState]);

  /* ========== Timer effect (client-side sync) ========== */
  useEffect(() => {
    if (!running || baseTime === null) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - baseTime) / 1000);
      const remaining = Math.max(60 - elapsed, 0);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current);
        setRunning(false);
        playSound("timeout", muted);

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

        // auto resume countdown
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
  }, [running, baseTime, isMyTurn, rounds, score, mode, muted]);

  /* ========== checkAnswer ========== */
  const checkAnswer = () => {
    try {
      const expr = expression.trim();
      if (!/\d/.test(expr)) { setResultPopup("invalid"); return; }
      if (/^[+\-×÷*/)]/.test(expr)) { setResultPopup("invalid"); return; }
      if (/[+\-×÷*/(]$/.test(expr)) { setResultPopup("invalid"); return; }

      const clean = expr
        .replace(/×/g, "*")
        .replace(/÷/g, "/")
        .replace(/\^/g, "**")
        .replace(/√(\d+|\([^()]+\))/g, "Math.sqrt($1)");

      // eslint-disable-next-line no-eval
      const evalResult = eval(clean);
      const correct = Number.isFinite(evalResult) && Math.abs(evalResult - target) < 1e-9;

      if (correct) {
        playSound("correct", muted);
        setScore((s) => s + 1);
        setResultPopup("correct");
        setSolutionExpr("");
      } else {
        playSound("wrong", muted);
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

      // auto-resume countdown
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

  /* ========== helper controls ========== */
  const stopTimer = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };

  const startGame = (m) => { socketRef.current?.emit("startGame", { mode: m, nickname }); };

  const endGameForAll = () => {
    if (resultPopup === "gameover") return;
    try { playSound("click", muted); } catch {}
    stopTimer();
    setRunning(false);
    setResultPopup("gameover");
    socketRef.current?.emit("endGame", { mode, by: nickname, reason: "endedByPlayer" });
  };

  const leaveGame = () => {
    try { playSound("click", muted); } catch {}
    stopTimer();
    setRunning(false);
    setResultPopup("gameover");
    socketRef.current?.emit("playerLeftGame", { nickname, mode });
  };

  const onBack = () => {
    playSound("click", muted);
    if (page === "game") {
      stopTimer();
      const activeMode = gameState?.mode || mode;
      socketRef.current?.emit("playerLeftGame", { nickname, mode: activeMode });
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
  };

  const onChooseMode = (m) => {
    playSound("click", muted);
    setMode(m);
    socketRef.current?.emit("joinGame", { nickname, mode: m });
    setPage("waiting");
  };

  const onStartFromWaiting = () => socketRef.current?.emit("startGame", { mode, nickname });

  const onLeaveFromWaiting = () => {
    playSound("click", muted);
    socketRef.current?.emit("leaveGame", { nickname, mode });
    setPage("mode");
  };

  const fade = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } };

  return (
    <motion.div key={theme} className="container" data-theme={theme} style={{ background: currentTheme.background, color: currentTheme.text }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
      <TopControls lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} dropdownOpen={null} setDropdownOpen={() => {}} muted={muted} setMuted={setMuted} volume={volume} setVolume={setVolume} toggleMute={toggleMute} texts={texts} themes={themes} />
      <BackButton page={page} onBack={onBack} />

      <AnimatePresence mode="wait">
        {page === "login" && (
          <motion.div key="login" className="login-page" {...fade}>
            <div className="glass-card">
              <h1 className="title">{T.title}</h1>
              <p className="subtitle">{T.subtitle}</p>
              <input type="text" placeholder={T.enterName} value={nickname} onChange={(e) => setNickname(e.target.value)} />
              <button className="main-btn" onClick={() => { if (nickname.trim()) { playSound("click", muted); socketRef.current?.emit("setNickname", nickname); setPage("mode"); } }}>{T.start}</button>
            </div>
          </motion.div>
        )}

        {page === "mode" && (
          <motion.div key="mode" className="mode-page" {...fade}>
            <ModePage T={T} nickname={nickname} playerList={playerList} onChooseMode={onChooseMode} />
          </motion.div>
        )}

        {page === "waiting" && (
          <motion.div key="waiting" className="waiting-page" {...fade}>
            <WaitingPage lang={lang} waitingPlayers={waitingPlayers} mode={mode} onStartGame={onStartFromWaiting} onLeave={onLeaveFromWaiting} />
          </motion.div>
        )}

        {page === "game" && (
          <motion.div key="game" className="game-page" {...fade}>
            <GamePage
              T={T}
              nickname={nickname}
              isMyTurn={isMyTurn}
              gameState={gameState}
              timeLeft={timeLeft}
              target={target}
              score={score}
              digits={digits}
              operators={operators}
              expression={expression}
              lastWasNumber={lastWasNumber}
              disabledOps={disabledOps}
              onDigit={(d) => { playSound("click", muted); if (!expression.includes(String(d)) && !lastWasNumber) { setExpression((p) => p + d); setLastWasNumber(true); } }}
              onOp={(op) => { playSound("click", muted); setExpression((p) => p + op); if (["+", "-", "×", "÷", "(", "√"].includes(op)) setLastWasNumber(false); else if (op === ")") setLastWasNumber(true); }}
              onDelete={() => { playSound("click", muted); setExpression((p) => p.slice(0, -1)); setLastWasNumber(false); setLastWasSqrt(false); }}
              onSubmit={() => { playSound("click", muted); checkAnswer(); }}
              resultPopup={resultPopup}
              solutionExpr={solutionExpr}
              autoResumeCount={autoResumeCount}
              onPlayAgain={() => startGame(mode)}
              onExit={() => { stopTimer(); setPage("stats"); }}
            />
          </motion.div>
        )}

        {page === "stats" && (
          <motion.div key="stats" {...fade}>
            <StatsPage T={T} scores={{}} waitingPlayers={waitingPlayers} gameState={gameState} nickname={nickname} onBack={() => setPage("mode")} />
          </motion.div>
        )}
      </AnimatePresence>

      <Popups resultPopup={resultPopup} T={T} solutionExpr={solutionExpr} autoResumeCount={autoResumeCount} onPlayAgain={() => startGame(mode)} onExit={() => { stopTimer(); setPage("stats"); }} />
    </motion.div>
  );
}
