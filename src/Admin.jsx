import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import "./App.css";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

export default function Admin() {
  const [loading, setLoading] = useState(true);
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineList, setOnlineList] = useState([]);
  const [rooms, setRooms] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [busy, setBusy] = useState(false);
  const [theme] = useState("galaxyBlue");

  const currentTheme = useMemo(
    () =>
      ({
        galaxyBlue: {
          background: "radial-gradient(circle at 20% 30%, #001133, #000000 70%)",
          text: "#eaf6ff",
        },
        galaxyPink: {
          background: "radial-gradient(circle at 80% 20%, #2a001f, #000000 80%)",
          text: "#ffe6ff",
        },
      })[theme],
    [theme]
  );

  const load = async () => {
    try {
      setLoading(true);
      const r = await fetch(`${SERVER_URL}/admin/clients`, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setOnlineCount(j.onlineCount ?? 0);
      setOnlineList(j.online ?? []);
      setRooms(j.rooms ?? {});
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Admin load failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const kickPlayer = async (modeKey, player) => {
    if (!confirm(`Kick "${player}" from "${modeKey}"?`)) return;
    try {
      setBusy(true);
      const r = await fetch(`${SERVER_URL}/admin/kick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: modeKey, nickname: player }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await load();
    } catch (e) {
      console.error("Kick failed:", e);
    } finally {
      setBusy(false);
    }
  };

  const startRoom = async (modeKey) => {
    if (!confirm(`Start room "${modeKey}"?`)) return;
    try {
      setBusy(true);
      const r = await fetch(`${SERVER_URL}/admin/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: modeKey }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await load();
    } catch (e) {
      console.error("Start failed:", e);
    } finally {
      setBusy(false);
    }
  };

  const resetServer = async () => {
    try {
      if (!confirm("This will clear all rooms and active games. Continue?")) return;
      setBusy(true);
      const r = await fetch(`${SERVER_URL}/admin/reset`, { method: "POST" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await load();
    } catch (e) {
      console.error("Reset failed:", e);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [autoRefresh]);

  const fade = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  const roomKeys = useMemo(() => Object.keys(rooms || {}), [rooms]);

  return (
    <motion.div
      className="container"
      style={{
        background: currentTheme.background,
        color: currentTheme.text,
        minHeight: "100vh",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div className="login-page" {...fade}>
        <div className="glass-card" style={{ maxWidth: 1100, width: "100%" }}>
          <h1 className="title">IQ180 — Server Admin</h1>
          <p className="subtitle">
            Monitor online clients & rooms. Reset game state when needed.
          </p>

          {/* Stats and controls */}
          <div
            className="mode-buttons"
            style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}
          >
            <div className="glass-card" style={{ padding: 16 }}>
              <h3>Online Clients</h3>
              <p style={{ fontSize: 28, margin: 0 }}>
                <span className="highlight">{onlineCount}</span>
              </p>
              <p style={{ marginTop: 8, wordBreak: "break-word" }}>
                {onlineList.length ? onlineList.join(", ") : "—"}
              </p>
            </div>

            <div className="glass-card" style={{ padding: 16 }}>
              <h3>Controls</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="main-btn" onClick={load} disabled={loading}>
                  🔄 Refresh
                </button>
                <button
                  className="secondary-btn"
                  onClick={() => setAutoRefresh((v) => !v)}
                >
                  {autoRefresh ? "⏸ Stop Auto-Refresh" : "▶️ Start Auto-Refresh"}
                </button>
                <button
                  className="main-btn"
                  style={{ background: "#b00020" }}
                  onClick={resetServer}
                  disabled={busy}
                >
                  🧹 Reset Server
                </button>
              </div>
              <p style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>
                Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "—"}
              </p>
            </div>
          </div>

          {/* Room overview */}
          <div className="glass-card" style={{ marginTop: 16, padding: 16 }}>
            <h3>Rooms</h3>

            {loading ? (
              <div style={{ padding: 12 }}>Loading…</div>
            ) : roomKeys.length === 0 ? (
              <div style={{ padding: 12, color: "rgba(255,255,255,0.7)" }}>
                No active rooms
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 12,
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                }}
              >
                {roomKeys.map((modeKey) => {
                  const r = rooms[modeKey] || {};
                  const players = Array.isArray(r.players) ? r.players : [];
                  const turnOrder = Array.isArray(r.turnOrder) ? r.turnOrder : [];
                  const current = r.currentTurn ?? null;
                  const rounds = r.rounds ?? 0;

                  return (
                    <div
                      key={modeKey}
                      className="glass-card"
                      style={{
                        borderRadius: 12,
                        padding: 16,
                        background: "rgba(255,255,255,0.03)",
                        boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              textTransform: "uppercase",
                              opacity: 0.7,
                            }}
                          >
                            {modeKey}
                          </div>
                          <h4 style={{ margin: "4px 0", fontSize: 18 }}>
                            {modeKey === "easy"
                              ? "Normal Mode"
                              : modeKey === "hard"
                                ? "Genius Mode"
                                : modeKey}
                          </h4>
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                              fontSize: 13,
                              opacity: 0.9,
                            }}
                          >
                            <div
                              style={{
                                padding: "4px 8px",
                                borderRadius: 8,
                                background: "rgba(255,255,255,0.05)",
                              }}
                            >
                              👥 Players: <strong>{players.length}</strong>
                            </div>
                            <div
                              style={{
                                padding: "4px 8px",
                                borderRadius: 8,
                                background: "rgba(255,255,255,0.05)",
                              }}
                            >
                              🌀 Round: <strong>{rounds}</strong>
                            </div>
                          </div>
                        </div>

                        <button
                          className="main-btn"
                          onClick={() => startRoom(modeKey)}
                          disabled={busy}
                          title="Force start this room"
                        >
                          🚀 Start
                        </button>
                      </div>

                      <div
                        style={{
                          marginTop: 12,
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: 12,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "rgba(255,255,255,0.7)",
                              marginBottom: 6,
                            }}
                          >
                            Players
                          </div>
                          <ul
                            style={{
                              margin: 0,
                              padding: 0,
                              listStyle: "none",
                              display: "flex",
                              flexDirection: "column",
                              gap: 6,
                            }}
                          >
                            {players.length ? (
                              players.map((p) => (
                                <li
                                  key={p}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "6px 8px",
                                    borderRadius: 8,
                                    background:
                                      p === current
                                        ? "rgba(255,196,60,0.12)"
                                        : "rgba(255,255,255,0.03)",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 10,
                                    }}
                                  >
                                    <span
                                      style={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: "50%",
                                        background:
                                          p === current
                                            ? "#FFC43C"
                                            : "rgba(255,255,255,0.4)",
                                      }}
                                    ></span>
                                    <span
                                      style={{
                                        fontWeight: p === current ? 700 : 400,
                                      }}
                                    >
                                      {p}
                                    </span>
                                  </div>
                                  <button
                                    className="secondary-btn"
                                    onClick={() => kickPlayer(modeKey, p)}
                                    disabled={busy}
                                  >
                                    🗑 Kick
                                  </button>
                                </li>
                              ))
                            ) : (
                              <li
                                style={{
                                  color: "rgba(255,255,255,0.6)",
                                  padding: "4px 8px",
                                }}
                              >
                                —
                              </li>
                            )}
                          </ul>
                        </div>

                        <div style={{ minWidth: 110 }}>
                          <div
                            style={{
                              fontSize: 12,
                              color: "rgba(255,255,255,0.7)",
                              marginBottom: 6,
                            }}
                          >
                            Turn Order
                          </div>
                          {turnOrder.length ? (
                            turnOrder.map((t, i) => (
                              <div
                                key={`${t}-${i}`}
                                style={{
                                  padding: "6px 8px",
                                  borderRadius: 8,
                                  background:
                                    t === current ? "#FFC43C" : "rgba(255,255,255,0.03)",
                                  fontWeight: t === current ? 700 : 500,
                                  marginBottom: 4,
                                }}
                              >
                                {i + 1}. {t}
                              </div>
                            ))
                          ) : (
                            <div style={{ color: "rgba(255,255,255,0.6)" }}>—</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="stats-actions" style={{ marginTop: 16 }}>
            <a className="secondary-btn" href="/" title="Back to Game">
              ← Back to Game
            </a>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
