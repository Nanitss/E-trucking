import React from "react";
import "./Loader.css"; // Expecting a new CSS file for loader styles

export default function Loader({ size = "medium", message = "Loading..." }) {
  return (
    <div className="modern-loader-container">
      <div className={`modern-spinner ${size}`}></div>
      {message && <p className="loader-message">{message}</p>}
    </div>
  );
}
