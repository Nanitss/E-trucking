import React, { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";

const Modal = ({ title, children, onClose, size }) => {
  // Determine the CSS class based on the size prop
  const modalClass = `modal-content ${size === "large" ? "modal-large" : ""}`;
  const [isClosing, setIsClosing] = useState(false);

  // Safely close the modal with a transition
  const handleClose = () => {
    setIsClosing(true);
    // Allow time for animations and component cleanups
    setTimeout(() => {
      onClose();
    }, 100);
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) handleClose();
    };
    window.addEventListener("keydown", handleEsc);

    // Prevent scrolling on body when modal is open
    document.body.style.overflow = "hidden";

    // Cleanup function
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "auto";
    };
  }, []);

  // Prevent clicks inside the modal from closing it
  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div
      className={`modal-overlay ${isClosing ? "closing" : ""}`}
      onClick={handleClose}
    >
      <div className={modalClass} onClick={handleContentClick}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={handleClose}>
            <FaTimes />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
