// src/hooks/useSocket.js
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

/**
 * useSocket
 * - creates a single socket instance and cleans up on unmount
 * - returns socketRef and a small emit helper
 */
export default function useSocket({ url = "http://192.168.1.166:4000" } = {}) {
  const socketRef = useRef(null);

  useEffect(() => {
    const s = io(url, { autoConnect: true });
    socketRef.current = s;

    s.on("connect", () => {
      console.log("🟢 socket connected", s.id);
    });

    // cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.off();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [url]);

  const emit = (evt, payload) => {
    socketRef.current?.emit(evt, payload);
  };

  return { socketRef, emit };
}
