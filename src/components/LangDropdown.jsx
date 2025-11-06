// src/components/LangDropdown.jsx
import React from "react";

export default function LangDropdown({ lang, setLang, dropdownOpen, setDropdownOpen, texts }) {
  return (
    <div className="lang-dropdown">
      <button className="control-btn" onClick={() => setDropdownOpen(dropdownOpen === "lang" ? null : "lang")}>
        🌐
      </button>
      {dropdownOpen === "lang" && (
        <div className="dropdown-menu">
          {Object.keys(texts).map((code) => (
            <div key={code} className={`dropdown-item ${lang === code ? "active" : ""}`} onClick={() => { setLang(code); setDropdownOpen(null); }}>
              {code.toUpperCase()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
