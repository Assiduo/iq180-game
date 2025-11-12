// src/components/game/WaitingTurn.jsx
export default function WaitingTurn({ gameState, timeLeft }) {
    return (
        <div className="waiting-turn glass-card">
            <h2 className="waiting-title">
                ⏳ Waiting for <span className="highlight">{gameState?.currentTurn}</span>
                ...
            </h2>

            <div className="waiting-timer">
                <h1 className={`time-left ${timeLeft <= 10 ? "time-critical" : ""}`}>
                    {timeLeft > 0 ? `${timeLeft}s` : "00s"}
                </h1>
            </div>

            <p className="hint-text">Please wait until it's your turn to play.</p>
        </div>
    );
}
