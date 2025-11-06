// src/components/ThemeDropdown.jsx
import React from "react";

export default function ThemeDropdown({ theme, setTheme, dropdownOpen, setDropdownOpen, themes }) {
  return (
    <div className="theme-dropdown">
      <button className="control-btn" onClick={() => setDropdownOpen(dropdownOpen === "theme" ? null : "theme")}>🎨</button>
      {dropdownOpen === "theme" && (
        <div className="dropdown-menu">
          {Object.entries(themes).map(([key, val]) => (
            <div key={key} className={`dropdown-item ${theme === key ? "active" : ""}`} onClick={() => { setTheme(key); setDropdownOpen(null); }}>
              {val.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
