import { FaPalette } from "react-icons/fa";

export default function ThemeDropdown({
  dropdownOpen,
  setDropdownOpen,
  themes,
  theme,
  setTheme,
}) {
  return (
    <div className="theme-dropdown">
      <button
        className="control-btn"
        onClick={() =>
          setDropdownOpen(dropdownOpen === "theme" ? null : "theme")
        }
      >
        <FaPalette />
      </button>

      {dropdownOpen === "theme" && (
        <div className="dropdown-menu">
          {Object.entries(themes).map(([key, val]) => (
            <div
              key={key}
              className={`dropdown-item ${theme === key ? "active" : ""}`}
              onClick={() => {
                setTheme(key);
                setDropdownOpen(null);
              }}
            >
              {val.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
