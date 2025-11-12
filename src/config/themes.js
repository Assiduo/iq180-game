// src/config/themes.js

export const themes = {
  galaxyBlue: {
    name: "Galaxy Neon Blue",
    background: "radial-gradient(circle at 20% 30%, #001133, #000000 70%)",
    accent: "#00bfff",
    text: "#eaf6ff",
  },
  galaxyPink: {
    name: "Cyber Neon Pink",
    background: "radial-gradient(circle at 80% 20%, #2a001f, #000000 80%)",
    accent: "#ff00a6",
    text: "#ffe6ff",
  },
  auroraEmerald: {
    name: "Aurora Emerald",
    background: "linear-gradient(135deg, #003333, #006644, #001122)",
    accent: "#00ffcc",
    text: "#eafff4",
  },
  crimsonInferno: {
    name: "Crimson Inferno",
    background: "linear-gradient(135deg, #2b0000, #660000, #330000)",
    accent: "#ff4444",
    text: "#ffe5e5",
  },
};

/**
 * Get current theme object by name.
 * Fallback to 'galaxyBlue' if not found.
 */
export function getTheme(name = "galaxyBlue") {
  return themes[name] || themes.galaxyBlue;
}
