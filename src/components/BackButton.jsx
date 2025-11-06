// src/components/BackButton.jsx
import React from "react";
import { FaArrowLeft } from "react-icons/fa";

export default function BackButton({ page, onBack }) {
  if (page === "login") return null;
  return (
    <button className="back-btn" onClick={onBack}>
      <FaArrowLeft />
    </button>
  );
}
