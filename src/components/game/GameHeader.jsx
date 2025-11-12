import { FaSignOutAlt } from "react-icons/fa";
import "../../styles/gameHeader.css";

export default function GameHeader({
    T,
    nickname,
    reactions,
    dropdownOpen,
    setDropdownOpen,
    isHost,
    isMyTurn,
    endGameForAll,
    leaveGame,
    sendEmoji,
    gameState,
    rounds,
    timeLeft,
    score,
    target,
}) {
    return (
        <div className="game-header">
            {/* 🧑 Player Info */}
            <h2 className="big-player">
                {T.playerName}: <span>{nickname}</span>
                {reactions[nickname] && (
                    <span style={{ marginLeft: 10, fontSize: 22, opacity: 0.95 }}>
                        {reactions[nickname].emoji}
                    </span>
                )}
            </h2>

            {/* 🔘 Bottom Controls */}
            <div className="bottom-controls">
                {/* Leave Game */}
                <button className="glass-btn" onClick={leaveGame}>
                    <FaSignOutAlt /> {T.exitGame}
                </button>

                {/* Emoji Dropdown */}
                <div className="emoji-dropdown">
                    <button
                        className="glass-btn"
                        onClick={() =>
                            setDropdownOpen(dropdownOpen === "emoji" ? null : "emoji")
                        }
                        title="Send emoji"
                    >
                        😊
                    </button>

                    {dropdownOpen === "emoji" && (
                        <div className="dropdown-menu emoji-menu">
                            {["😊", "🔥", "👏", "😮", "😂", "👍", "❤️", "🎉"].map((e) => (
                                <button
                                    key={e}
                                    className="emoji-btn"
                                    onClick={() => {
                                        sendEmoji(e);
                                        setDropdownOpen(null);
                                    }}
                                >
                                    {e}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Host End Game */}
                {isHost && (
                    <button
                        className="glass-btn end-btn"
                        style={{ borderColor: "rgba(255,100,100,0.6)" }}
                        onClick={endGameForAll}
                    >
                        🛑 {T.endGame}
                    </button>
                )}
            </div>

            {/* 🎯 Game Status */}
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
                        <p
                            className={
                                timeLeft <= 10 ? "time-score time-low" : "time-score"
                            }
                        >
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
                        ⏳ Waiting for{" "}
                        <span className="highlight">{gameState?.currentTurn}</span>...
                    </h3>
                    <h1
                        className={`waiting-time ${timeLeft <= 10 ? "time-critical" : ""}`}
                    >
                        {timeLeft > 0 ? `${timeLeft}s` : "00s"}
                    </h1>
                    {gameState?.currentTurn && reactions[gameState.currentTurn] && (
                        <div style={{ marginTop: 6 }}>
                            <strong>{reactions[gameState.currentTurn].emoji}</strong>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
