// src/components/VolumeDropdown.jsx
import React from "react";

export default function VolumeDropdown({ muted, setMuted, volume, setVolume, dropdownOpen, setDropdownOpen, toggleMute }) {
  return (
    <div className="volume-dropdown">
      <button className="control-btn" onClick={() => setDropdownOpen(dropdownOpen === "volume" ? null : "volume")}>🔊</button>
      {dropdownOpen === "volume" && (
        <div className="dropdown-menu volume-menu">
          <div className="volume-control">
            <span onClick={toggleMute} style={{ cursor: "pointer" }}>🔈</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setVolume(val);
                setMuted(val === 0);
              }}
              className="volume-slider"
            />
          </div>
        </div>
      )}
    </div>
  );
}
