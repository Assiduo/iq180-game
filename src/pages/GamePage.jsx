import { motion } from "framer-motion";
import { FaSignOutAlt, FaRedo } from "react-icons/fa";
import ActiveTurn from "../components/game/ActiveTurn";
import WaitingTurn from "../components/game/WaitingTurn";
import ResultPopup from "../components/game/ResultPopup";
import GameHeader from "../components/game/GameHeader";

export default function GamePage({
    T,
    lang,
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
    digits,
    operators,
    disabledOps,
    expression,
    lastWasNumber,
    lastWasSqrt,
    solutionExpr,
    resultPopup,
    endByName,
    autoResumeCount,
    play,
    setExpression,
    setLastWasNumber,
    setLastWasSqrt,
    stopTimer,
    startGame,
    setPage,
    checkAnswer,
    fade,
    target,
}) {
    return (
        <motion.div key="game" className="game-page" {...fade}>
            <GameHeader
                T={T}
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
                target={target}
            />

            {!isMyTurn ? (
                <WaitingTurn gameState={gameState} timeLeft={timeLeft} />
            ) : (
                <ActiveTurn
                    T={T}
                    play={play}
                    digits={digits}
                    operators={operators}
                    disabledOps={disabledOps}
                    expression={expression}
                    lastWasNumber={lastWasNumber}
                    lastWasSqrt={lastWasSqrt}
                    setExpression={setExpression}
                    setLastWasNumber={setLastWasNumber}
                    setLastWasSqrt={setLastWasSqrt}
                    checkAnswer={checkAnswer}
                />
            )}

            <ResultPopup
                T={T}
                resultPopup={resultPopup}
                solutionExpr={solutionExpr}
                autoResumeCount={autoResumeCount}
                play={play}
                startGame={startGame}
                stopTimer={stopTimer}
                setPage={setPage}
                endByName={endByName}
            />
        </motion.div>
    );
}
