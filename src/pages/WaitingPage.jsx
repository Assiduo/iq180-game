import { motion } from "framer-motion";

export default function WaitingPage({
    T,
    lang,
    mode,
    nickname,
    waitingPlayers,
    reactions,
    play,
    socket,
    setPage,
    fade,
}) {
    const getText = (th, zh, en) => (lang === "th" ? th : lang === "zh" ? zh : en);

    return (
        <motion.div key="waiting" className="waiting-page" {...fade}>
            {/* 🕒 Title */}
            <h1 className="waiting-title">
                {waitingPlayers.length > 1
                    ? getText("พร้อมเริ่มเกม!", "准备开始游戏！", "Ready to Start!")
                    : getText(
                          "⏳ รอผู้เล่น...",
                          "⏳ 等待玩家...",
                          "⏳ Waiting for players..."
                      )}
            </h1>

            {/* 🎮 Mode Display */}
            <h2>
                {getText("โหมด", "模式", "Mode")}:{" "}
                <span className="highlight">{mode === "easy" ? T.easy : T.hard}</span>
            </h2>

            {/* 👥 Waiting List */}
            <div className="waiting-box glass-card">
                {waitingPlayers.length > 0 ? (
                    <ul>
                        {waitingPlayers.map((p, i) => (
                            <li key={i}>
                                {p}
                                {reactions[p] && (
                                    <span style={{ marginLeft: 8 }}>
                                        {reactions[p].emoji}
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>
                        {getText(
                            "ยังไม่มีผู้เล่นในห้องนี้",
                            "该房间暂无玩家",
                            "No players yet"
                        )}
                    </p>
                )}
            </div>

            {/* 🚀 Start Button (visible only when >= 2 players) */}
            {waitingPlayers.length > 1 && (
                <button
                    className="main-btn"
                    onClick={() => {
                        socket.emit("startGame", { mode, nickname });
                    }}
                >
                    🚀 {getText("เริ่มเกม", "开始游戏", "Start Game")}
                </button>
            )}

            {/* ← Leave Button */}
            <button
                className="secondary-btn"
                onClick={() => {
                    play("click");
                    socket.emit("leaveGame", { nickname, mode }); // leave room
                    setPage("mode"); // go back to mode select
                }}
            >
                ← {getText("ออกจากห้อง", "离开房间", "Leave Room")}
            </button>
        </motion.div>
    );
}
