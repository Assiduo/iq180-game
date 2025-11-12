import { FaVolumeUp } from "react-icons/fa";

export default function VolumeDropdown({
  dropdownOpen,
  setDropdownOpen,
  volume,
  muted,
  setVolume,
  toggleMute,
}) {
  return (
    <div className="volume-dropdown">
      <button
        className="control-btn"
        onClick={() => setDropdownOpen(dropdownOpen === "volume" ? null : "volume")}
      >
        <FaVolumeUp />
      </button>

      {dropdownOpen === "volume" && (
        <div className="dropdown-menu volume-menu">
          <div className="volume-control">
            <FaVolumeUp className="volume-icon" onClick={toggleMute} />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="volume-slider"
            />
          </div>
        </div>
      )}
    </div>
  );
}
