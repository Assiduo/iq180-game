import React from "react";
import { motion } from "framer-motion";
import { FaArrowRight } from "react-icons/fa";

/**
 * LoginPage component
 *
 * Props:
 * - T: translations object (title, subtitle, enterName, start)
 * - nickname: current nickname state
 * - setNickname: setter for nickname state
 * - play: sound play function
 * - socket: socket instance
 * - setPage: function to change page state
 * - fade: motion props passed from parent
 */
export default function LoginPage({
  T,
  nickname,
  setNickname,
  play,
  socket,
  setPage,
  fade,
}) {
  const submit = () => {
    if (nickname.trim()) {
      play?.("click");
      socket?.emit?.("setNickname", nickname);
      setPage?.("intro");
    }
  };

  return (
    <motion.div key="login" className="login-page" {...fade}>
      <div className="glass-card">
        <h1 className="title">{T.title}</h1>
        <p className="subtitle">{T.subtitle}</p>

        <input
          type="text"
          placeholder={T.enterName}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />

        <button
          className="main-btn"
          onClick={submit}
          aria-label="Start"
        >
          {T.start} <FaArrowRight />
        </button>
      </div>
    </motion.div>
  );
}
