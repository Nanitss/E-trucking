const express = require("express");
const router = express.Router();
const {
  login,
  getCurrentUser,
  logout,
  validateSession,
} = require("../controllers/authController");
const { authenticateJWT } = require("../middleware/auth");

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post("/login", login);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", authenticateJWT, getCurrentUser);

// @route   GET /api/auth/current-user
// @desc    Get current user (alias for /me)
// @access  Private
router.get("/current-user", authenticateJWT, getCurrentUser);

// @route   GET /api/auth/validate-session
// @desc    Check if current session is still valid (single-session enforcement)
// @access  Private
router.get("/validate-session", authenticateJWT, validateSession);

// @route   POST /api/auth/logout
// @desc    Log the user out and record the logout action
// @access  Private
router.post("/logout", authenticateJWT, logout);

module.exports = router;
