// src/components/TopControls.jsx
import React from "react";
import LangDropdown from "./LangDropdown";
import ThemeDropdown from "./ThemeDropdown";
import VolumeDropdown from "./VolumeDropdown";

export default function TopControls(props) {
  return (
    <div className="top-controls">
      <LangDropdown {...props} />
      <ThemeDropdown {...props} />
      <VolumeDropdown {...props} />
    </div>
  );
}
