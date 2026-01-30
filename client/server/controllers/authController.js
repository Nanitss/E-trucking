const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db } = require("../config/firebase");
const AuditService = require("../services/AuditService");

// Login user with Firebase authentication
exports.login = async (req, res) => {
  console.log("📩 Login request received:", {
    body: req.body,
    headers: {
      "content-type": req.headers["content-type"],
    },
  });

  const { username, password } = req.body;

  if (!username || !password) {
    console.log("❌ Missing username or password");
    return res.status(400).json({ message: "Username and password required." });
  }

  try {
    // Check if user exists in Firestore
    console.log("🔍 Querying Firestore for user:", username);
    const usersRef = db.collection("users");
    const snapshot = await usersRef.where("username", "==", username).get();

    console.log("🗃️ Firestore returned:", { userCount: snapshot.size });

    if (snapshot.empty) {
      console.log("❌ User not found in Firestore");
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Get the first matching user
    const userDoc = snapshot.docs[0];
    const user = userDoc.data();

    console.log("✅ User found:", {
      id: userDoc.id,
      username: user.username,
      role: user.role,
      status: user.status,
      passwordLength: user.password?.length || 0,
    });

    // Check password
    console.log("🔐 Comparing passwords...");
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("🔐 Password match result:", isMatch);

    if (!isMatch) {
      console.log("❌ Password doesn't match");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if user is active
    if (user.status !== "active") {
      console.log(`❌ User status is "${user.status}", not "active"`);
      return res
        .status(403)
        .json({
          message: "Account is inactive. Please contact administrator.",
        });
    }
    console.log("✅ User status is active");

    // Create and return token
    const payload = {
      id: userDoc.id,
      username: user.username,
      role: user.role,
    };

    console.log("🔏 Creating JWT token with payload:", payload);

    // Prepare user data to send with the response (excluding sensitive data)
    const userData = {
      id: userDoc.id,
      username: user.username,
      role: user.role,
      status: user.status,
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || "fallback-secret-for-development",
      { expiresIn: "24h" },
      async (err, token) => {
        if (err) {
          console.log("❌ Error creating token:", err);
          throw err;
        }

        // Log the successful login
        try {
          await AuditService.logLogin(userData.id, userData.username, req.ip);
          console.log("✅ Login action logged successfully");
        } catch (logError) {
          console.error("⚠️ Error logging login action:", logError);
          // Continue even if logging fails
        }

        console.log("✅ Token created successfully");
        // Return both token and user data to avoid a second request
        res.json({ token, user: userData });
      },
    );
  } catch (error) {
    console.error("❌ Server error:", error);

    // Handle specific Firestore quota exceeded errors
    if (
      error.code === 8 ||
      error.message.includes("RESOURCE_EXHAUSTED") ||
      error.message.includes("Quota exceeded")
    ) {
      console.error("⚠️ Firestore quota exceeded during login attempt");
      return res.status(503).json({
        message:
          "Service temporarily unavailable due to high usage. Please try again later.",
        error: "QUOTA_EXCEEDED",
      });
    }

    res.status(500).json({ message: "Server error" });
  }
};

// Get current user from Firestore
exports.getCurrentUser = async (req, res) => {
  console.log("📩 Get current user request received");
  console.log("🔒 User from token:", req.user);

  try {
    const userRef = db.collection("users").doc(req.user.id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.log("❌ User not found by ID:", req.user.id);
      return res.status(404).json({ message: "User not found" });
    }

    const userData = userDoc.data();
    // Only return non-sensitive user data
    const user = {
      id: userDoc.id,
      username: userData.username,
      role: userData.role,
      status: userData.status,
    };

    console.log("✅ User data retrieved:", user);
    res.json(user);
  } catch (error) {
    console.error("❌ Server error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Logout user
exports.logout = async (req, res) => {
  console.log("📩 Logout request received");
  console.log("🔒 User from token:", req.user);

  try {
    // Log the logout action
    if (req.user && req.user.id) {
      try {
        await AuditService.logLogout(req.user.id, req.user.username);
        console.log(
          `✅ Logout action for user ${req.user.username} (${req.user.id}) logged successfully`,
        );
      } catch (logError) {
        console.error("❌ Error with AuditService.logLogout:", logError);
        console.error("Debug info:", { user: req.user });
      }
    } else {
      console.warn("⚠️ No user data available in request for logout auditing");
      console.warn("Headers:", req.headers);
      console.warn("Body:", req.body);
    }

    res.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("❌ Error during logout process:", error);
    // Still return success even if logging fails
    res.json({
      success: true,
      message: "Logout successful",
      debug: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
