// src/components/IntroPage.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { FaArrowRight } from "react-icons/fa";

/**
 * IntroPage
 *
 * Props:
 * - T: translations object
 * - nickname: string
 * - lang: 'en'|'th'|'zh'
 * - play: sound function (optional)
 * - setPage: function to change page
 * - fade: motion props from parent
 */
export default function IntroPage({
  T,
  nickname = "",
  lang = "en",
  play = () => {},
  setPage = () => {},
  fade = {},
}) {
  // local demo states (kept inside component)
  const [showDemo, setShowDemo] = useState(false);
  const [demoExpression, setDemoExpression] = useState("");
  const [demoResult, setDemoResult] = useState(null);
  const [demoUsedNums, setDemoUsedNums] = useState([false, false, false]);

  const numbers = [3, 8, 3];

  const onNumberClick = (num, idx) => {
    if (demoUsedNums[idx]) return;
    // allow adding number after operator or at start
    if (/[+\-×÷]$/.test(demoExpression) || demoExpression === "") {
      setDemoExpression((p) => p + num);
      const c = [...demoUsedNums];
      c[idx] = true;
      setDemoUsedNums(c);
    } else {
      play("wrong");
    }
  };

  const onOpClick = (op) => {
    if (!demoExpression || /[+\-×÷]$/.test(demoExpression)) {
      play("wrong");
      return;
    }
    setDemoExpression((p) => p + op);
  };

  const handleSubmitDemo = () => {
    const used = demoUsedNums.filter(Boolean).length;
    if (used < 3 || /[+\-×÷]$/.test(demoExpression)) {
      setDemoResult("❌");
      play("wrong");
      return;
    }
    try {
      // replace symbols and eval
      // eslint-disable-next-line no-eval
      const val = eval(demoExpression.replace(/×/g, "*").replace(/÷/g, "/"));
      setDemoResult(val);
      // optionally play success/wrong sounds depending on result; caller can decide
    } catch (err) {
      setDemoResult("❌");
      play("wrong");
    }
  };

  const resetDemo = () => {
    setDemoExpression("");
    setDemoUsedNums([false, false, false]);
    setDemoResult(null);
  };

  return (
    <motion.div key="intro" className="intro-page" {...fade}>
      <div
        className="glass-card"
        style={{ padding: "2.5rem", maxWidth: 900, margin: "2rem auto" }}
      >
        <h1 style={{ fontSize: "2.2rem", marginBottom: "0.6rem", color: "white" }}>
          {T.welcome},{" "}
          <span style={{ textDecoration: "underline", color: "white" }}>{nickname}</span>!
        </h1>

        <p style={{ marginBottom: "1.2rem", color: "rgba(255,255,255,0.85)" }}>
          {lang === "th"
            ? "ยินดีต้อนรับ! นี่คือวิธีการเล่นและเคล็ดลับก่อนเริ่มเกม"
            : lang === "zh"
              ? "欢迎！以下是开始游戏前的玩法说明与提示"
              : "Welcome! Here’s how to play and a few tips before you start."}
        </p>

        {/* How to Play */}
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            padding: "1rem 1.25rem",
            borderRadius: 14,
            marginBottom: "1.2rem",
          }}
        >
          <h2 style={{ marginBottom: "0.6rem" }}>
            {lang === "th" ? "วิธีการเล่น" : lang === "zh" ? "玩法说明" : "How to Play"}
          </h2>
          <ul
            style={{
              textAlign: "left",
              lineHeight: 1.8,
              fontSize: "1rem",
              color: "rgba(255,255,255,0.9)",
            }}
          >
            <li>
              🎯{" "}
              {lang === "th"
                ? "เป้าหมาย: สร้างสมการจากตัวเลขให้ได้ค่าตามเป้าหมาย"
                : lang === "zh"
                  ? "目标：使用提供的数字构建等式以匹配目标数字"
                  : "Goal: Build an equation from the digits to match the target number."}
            </li>
            <li>
              ➕➖✖️➗{" "}
              {lang === "th"
                ? "เลือกเครื่องหมายและคลิกตัวเลขเพื่อสร้างสมการ"
                : lang === "zh"
                  ? "选择运算符并点击数字来构建等式"
                  : "Choose operators and click digits to form the equation."}
            </li>
            <li>
              ⏰{" "}
              {lang === "th"
                ? "เวลา: 60 วินาทีต่อเทิร์น (โหมด Genius อาจสั้นลง)"
                : lang === "zh"
                  ? "时间：每回合 60 秒（天才模式可能更短）"
                  : "Time: 60 seconds per turn (Genius mode may be shorter)."}
            </li>
            <li>
              ✅❌{" "}
              {lang === "th"
                ? "ระบบจะตรวจคำตอบและให้คะแนนอัตโนมัติ"
                : lang === "zh"
                  ? "系统会自动检查答案并计分"
                  : "The system auto-checks answers and updates score."}
            </li>
            <li>
              👥{" "}
              {lang === "th"
                ? "โหมดผู้เล่นหลายคน: ระบบจะสลับตาระหว่างผู้เล่น"
                : lang === "zh"
                  ? "多人模式：系统会自动切换回合"
                  : "Multiplayer: turns automatically switch between players."}
            </li>
          </ul>
        </div>

        {/* Tips */}
        <div
          style={{
            background: "rgba(255,255,255,0.02)",
            padding: "0.8rem 1rem",
            borderRadius: 12,
            marginBottom: "1rem",
          }}
        >
          <h3 style={{ marginBottom: "0.4rem" }}>
            {lang === "th" ? "เคล็ดลับ" : lang === "zh" ? "提示" : "Tips"}
          </h3>
          <p style={{ color: "rgba(255,255,255,0.85)" }}>
            {lang === "th"
              ? "ลองเริ่มจากการจับคู่ง่าย ๆ และใช้การจัดลำดับเครื่องหมายเพื่อหลีกเลี่ยงการหารด้วยศูนย์"
              : lang === "zh"
                ? "先从简单组合尝试，注意避免除以 0"
                : "Start with simple combinations; avoid division by zero and try operator order to match target."}
          </p>
        </div>

        {/* Practice Demo Button */}
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <button
            onClick={() => {
              play("click");
              setShowDemo((p) => !p);
              setDemoExpression("");
              setDemoResult(null);
              setDemoUsedNums([false, false, false]);
            }}
            className="glass-btn"
            style={{
              padding: "0.6rem 1rem",
              borderRadius: "0.8rem",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "white",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            🧮{" "}
            {showDemo
              ? lang === "th"
                ? "ปิดโหมดฝึกซ้อม"
                : lang === "zh"
                  ? "关闭练习模式"
                  : "Close Practice Mode"
              : lang === "th"
                ? "เริ่มฝึกซ้อม (Demo)"
                : lang === "zh"
                  ? "开始练习 (Demo)"
                  : "Start Demo"}
          </button>
        </div>

        {/* Demo Practice Section */}
        {showDemo && (
          <div
            className="glass-card"
            style={{
              margin: "1.2rem auto",
              padding: "1.5rem",
              width: "90%",
              maxWidth: 500,
              borderRadius: "1rem",
              background: "rgba(255,255,255,0.05)",
            }}
          >
            <h3 style={{ marginBottom: "0.8rem", fontSize: "1.4rem" }}>
              {lang === "th"
                ? "ใช้ตัวเลขทั้งสามเพื่อให้ได้ผลลัพธ์ = 17"
                : lang === "zh"
                  ? "使用这三个数字使结果 = 17"
                  : "Use all three numbers to make result = 17"}
            </h3>

            {/* Numbers */}
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                justifyContent: "center",
                marginBottom: "0.8rem",
              }}
            >
              {numbers.map((num, idx) => (
                <button
                  key={idx}
                  onClick={() => onNumberClick(num, idx)}
                  disabled={demoUsedNums[idx]}
                  style={{
                    padding: "0.6rem 1rem",
                    fontSize: "1.2rem",
                    borderRadius: "0.6rem",
                    background: demoUsedNums[idx]
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(255,255,255,0.1)",
                    color: demoUsedNums[idx] ? "gray" : "white",
                    border: "1px solid rgba(255,255,255,0.2)",
                    cursor: demoUsedNums[idx] ? "not-allowed" : "pointer",
                  }}
                >
                  {num}
                </button>
              ))}
            </div>

            {/* Operators */}
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                justifyContent: "center",
                marginBottom: "0.8rem",
              }}
            >
              {["+", "-", "×", "÷"].map((op) => (
                <button
                  key={op}
                  onClick={() => onOpClick(op)}
                  style={{
                    padding: "0.5rem 0.8rem",
                    fontSize: "1.2rem",
                    borderRadius: "0.6rem",
                    background: "rgba(255,255,255,0.1)",
                    color: "#00bfff",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  {op}
                </button>
              ))}
            </div>

            <input
              value={demoExpression}
              readOnly
              placeholder={
                lang === "th"
                  ? "สร้างสมการที่นี่..."
                  : lang === "zh"
                    ? "在此构建等式..."
                    : "Build your equation here..."
              }
              style={{
                width: "100%",
                padding: "0.5rem",
                fontSize: "1rem",
                borderRadius: "0.5rem",
                marginBottom: "0.8rem",
                textAlign: "center",
              }}
            />

            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                justifyContent: "center",
                marginBottom: "0.5rem",
              }}
            >
              <button
                onClick={() => setDemoExpression((p) => p.slice(0, -1))}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.6rem",
                  background: "rgba(255,255,255,0.1)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.2)",
                }}
              >
                {T.delete}
              </button>

              <button
                onClick={handleSubmitDemo}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.6rem",
                  background: "#00bfff",
                  color: "white",
                  border: "none",
                }}
              >
                {T.submit}
              </button>

              <button
                onClick={resetDemo}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "0.6rem",
                  background: "rgba(255,255,255,0.05)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                🔄 {lang === "th" ? "รีเซ็ต" : lang === "zh" ? "重置" : "Reset"}
              </button>
            </div>

            {demoResult !== null && (
              <p style={{ marginTop: "1rem", fontSize: "1.2rem" }}>
                {lang === "th" ? "ผลลัพธ์:" : lang === "zh" ? "结果:" : "Result:"}{" "}
                <span
                  style={{
                    color:
                      demoResult === 17
                        ? "#00ff88"
                        : demoResult === "❌"
                          ? "#ff4444"
                          : "white",
                    fontWeight: "bold",
                  }}
                >
                  {demoResult}
                </span>
                {demoResult === 17 && <span style={{ marginLeft: "0.4rem" }}>✅</span>}
              </p>
            )}
          </div>
        )}

        <div
          style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 10 }}
        >
          <button
            className="secondary-btn"
            onClick={() => {
              play("click");
              setPage("login");
            }}
          >
            ← {T.back}
          </button>
          <button
            className="secondary-btn"
            onClick={() => {
              play("click");
              setPage("mode");
            }}
          >
            {lang === "th"
              ? "ไปเลือกโหมด"
              : lang === "zh"
                ? "进入模式选择"
                : "Continue to Game Mode"}{" "}
            <FaArrowRight />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
