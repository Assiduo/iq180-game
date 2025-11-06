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
        auroraEmerald: {
          background: "linear-gradient(135deg, #003333, #006644, #001122)",
          text: "#eafff4",
        },
        crimsonInferno: {
          background: "linear-gradient(135deg, #2b0000, #660000, #330000)",
          text: "#ffe5e5",
        },
      }[theme]),
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

  const resetServer = async () => {
    try {
      if (!confirm("This will clear waiting rooms and end active games. Continue?")) return;
      setBusy(true);
      const r = await fetch(`${SERVER_URL}/admin/reset`, { method: "POST" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await load();
      alert("✅ Server state reset.");
    } catch (e) {
      console.error("Reset failed:", e);
      alert("❌ Reset failed. Check server logs.");
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

  const roomsPretty = useMemo(() => JSON.stringify(rooms, null, 2), [rooms]);

  return (
    <motion.div
      className="container"
      style={{ background: currentTheme.background, color: currentTheme.text, minHeight: "100vh" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div className="login-page" {...fade}>
        <div className="glass-card" style={{ maxWidth: 960, width: "100%" }}>
          <h1 className="title">IQ180 — Server Admin</h1>
          <p className="subtitle">Monitor online clients & rooms. Reset game state when needed.</p>

          {/* Top stats + controls */}
          <div className="mode-buttons" style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
            <div className="glass-card" style={{ padding: 16 }}>
              <h3 style={{ marginTop: 0 }}>Online Clients</h3>
              <p style={{ fontSize: 28, margin: 0 }}>
                <span className="highlight">{onlineCount}</span>
              </p>
              <p style={{ marginTop: 8, wordBreak: "break-word" }}>
                {onlineList.length ? onlineList.join(", ") : "—"}
              </p>
            </div>

            <div className="glass-card" style={{ padding: 16 }}>
              <h3 style={{ marginTop: 0 }}>Controls</h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="main-btn" onClick={load} disabled={loading} title="Refresh now">
                  🔄 Refresh
                </button>
                <button
                  className="secondary-btn"
                  onClick={() => setAutoRefresh((v) => !v)}
                  title="Toggle auto refresh"
                >
                  {autoRefresh ? "⏸ Stop Auto-Refresh" : "▶️ Start Auto-Refresh"}
                </button>
                <button
                  className="main-btn"
                  style={{ background: "#b00020" }}
                  onClick={resetServer}
                  disabled={busy}
                  title="Reset server state (ends current games)"
                >
                  🧹 Reset Server State
                </button>
              </div>
              <p style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>
                Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "—"}
              </p>
            </div>
          </div>

          {/* Rooms panel */}
          <div className="glass-card" style={{ marginTop: 16, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Rooms</h3>
            <pre
              style={{
                background: "rgba(255,255,255,0.06)",
                borderRadius: 12,
                padding: 12,
                maxHeight: "50vh",
                overflow: "auto",
                color: currentTheme.text,
                margin: 0,
              }}
            >
              {loading ? "Loading…" : roomsPretty}
            </pre>
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
