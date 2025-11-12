import { FaGlobe } from "react-icons/fa";

export default function LanguageDropdown({
  dropdownOpen,
  setDropdownOpen,
  texts,
  lang,
  setLang,
}) {
  return (
    <div className="lang-dropdown">
      <button
        className="control-btn"
        onClick={() => setDropdownOpen(dropdownOpen === "lang" ? null : "lang")}
      >
        <FaGlobe />
      </button>

      {dropdownOpen === "lang" && (
        <div className="dropdown-menu">
          {Object.keys(texts).map((code) => (
            <div
              key={code}
              className={`dropdown-item ${lang === code ? "active" : ""}`}
              onClick={() => {
                setLang(code);
                setDropdownOpen(null);
              }}
            >
              {code.toUpperCase()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
