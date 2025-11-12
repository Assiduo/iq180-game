import { motion } from "framer-motion";

export default function ModePage({
    T,
    lang,
    nickname,
    reactions,
    playerList,
    play,
    socket,
    setMode,
    setPage,
    fade,
}) {
    return (
        <motion.div key="mode" className="mode-page" {...fade}>
            {/* 🧑 Player Header */}
            <h2 className="big-player">
                {T.playerName}: <span>{nickname}</span>
                {reactions[nickname] && (
                    <span style={{ marginLeft: 10, fontSize: 22, opacity: 0.95 }}>
                        {reactions[nickname].emoji}
                    </span>
                )}
            </h2>

            {/* 👥 Online Players List */}
            <div className="online-box glass-card">
                <h3 className="online-title">
                    👥{" "}
                    {lang === "th"
                        ? "ผู้เล่นที่ออนไลน์"
                        : lang === "zh"
                          ? "在线玩家"
                          : "Players Online"}
                </h3>

                {playerList && playerList.length > 0 ? (
                    <ul className="online-list">
                        {playerList.map((p, i) => (
                            <li key={i} className={p === nickname ? "self" : ""}>
                                {p === nickname ? (
                                    <span className="you-label">
                                        {lang === "th"
                                            ? "คุณ"
                                            : lang === "zh"
                                              ? "你"
                                              : "You"}
                                    </span>
                                ) : (
                                    p
                                )}
                                {reactions[p] && (
                                    <span style={{ marginLeft: 8, fontSize: 18 }}>
                                        {reactions[p].emoji}
                                    </span>
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

            {/* 🎮 Mode Selection */}
            <h1 className="select-mode-title">{T.selectMode}</h1>

            <div className="mode-buttons">
                <button
                    className="mode-btn glass-btn"
                    onClick={() => {
                        play("click");
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
                        play("click");
                        setMode("hard");
                        socket.emit("joinGame", { nickname, mode: "hard" });
                        setPage("waiting");
                    }}
                >
                    {T.hard}
                </button>
            </div>
        </motion.div>
    );
}
