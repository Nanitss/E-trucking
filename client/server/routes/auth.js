// server/routes/auth.js - Firebase version
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // Make sure you're using bcrypt, not bcryptjs
const { db } = require('../config/firebase');
const AuditService = require('../services/AuditService');
const { authenticateJWT } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();

router.post('/login', async (req, res) => {
  // Log everything for debugging
  console.log('\n===============================================');
  console.log('=== NEW LOGIN ATTEMPT (FIREBASE) ===');
  console.log('Time:', new Date().toISOString());
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  console.log('===============================================\n');

  const { username, password } = req.body;
  
  console.log('Extracted credentials:');
  console.log('- Username:', username);
  console.log('- Password length:', password ? password.length : 'undefined');
  console.log('- Password first 3 chars:', password ? password.substring(0, 3) + '***' : 'N/A');

  if (!username || !password) {
    console.log('❌ Missing credentials in request');
    return res.status(400).json({ message: 'Username and password required.' });
  }

  try {
    // Check if JWT_SECRET is set
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET not found in environment variables!');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    console.log('Querying Firestore for user...');
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('username', '==', username).get();
    
    console.log('Firestore query results:');
    console.log('- Documents returned:', snapshot.size);

    if (snapshot.empty) {
      console.log('❌ No user found with username:', username);
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Get the first user document
    const userDoc = snapshot.docs[0];
    const user = userDoc.data();
    
    console.log('Found user:');
    console.log('- ID:', userDoc.id);
    console.log('- Username:', user.username);
    console.log('- Role:', user.role);
    console.log('- Has password:', !!user.password);
    console.log('- Password hash (first 20 chars):', user.password ? user.password.substring(0, 20) + '...' : 'N/A');
    console.log('- Password hash length:', user.password ? user.password.length : 'N/A');

    try {
      console.log('Attempting password comparison...');
      const match = await bcrypt.compare(password, user.password);
      console.log('🔍 Password comparison result:', match);
      
      if (!match) {
        console.log('❌ Password comparison failed');
        
        // Additional debugging - try creating a new hash for comparison
        const testHash = await bcrypt.hash(password, 10);
        console.log('Test: Created hash for same password:', testHash);
        
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      console.log('✅ Password verified successfully');

      const token = jwt.sign(
        { 
          id: userDoc.id, 
          username: user.username,
          role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );
      
      console.log('✅ JWT token generated');
      console.log('✅ Login successful for user:', user.username);

      // Log the login event to audit trail
      await AuditService.logLogin(
        userDoc.id, 
        user.username, 
        req.ip || req.headers['x-forwarded-for']
      );
      
      console.log('✅ Login action logged to audit trail');

      res.json({
        token,
        user: { id: userDoc.id, username: user.username, role: user.role }
      });
    } catch (bcryptError) {
      console.error('❌ Bcrypt error:', bcryptError);
      return res.status(500).json({ message: 'Authentication error' });
    }
  } catch (error) {
    console.error('❌ Server error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user info
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    // Get user from Firestore
    const userDoc = await db.collection('users').doc(req.user.id).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = userDoc.data();
    
    // Return non-sensitive user data
    res.json({
      id: userDoc.id,
      username: userData.username,
      role: userData.role,
      status: userData.status
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add logout endpoint to record logout events
router.post('/logout', authenticateJWT, async (req, res) => {
  try {
    console.log('------------------------');
    console.log('LOGOUT REQUEST RECEIVED:');
    console.log('- User:', req.user);
    console.log('- Headers:', req.headers);
    console.log('- Body:', req.body);
    
    // Log the logout action
    console.log('Attempting to log logout via AuditService...');
    const auditResult = await AuditService.logLogout(req.user.id, req.user.username);
    console.log('AuditService result:', auditResult);
    
    console.log(`✅ Logout successful for user: ${req.user.username}`);
    
    // Send success response
    res.json({ message: 'Logout successful', auditId: auditResult?.id });
  } catch (error) {
    console.error('❌ Error logging out:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    // Even if audit logging fails, we still consider the logout successful
    res.json({ message: 'Logout successful', error: error.message });
  }
});

// Add a test route to manually trigger logout audit
router.post('/test-logout-audit', authenticateJWT, async (req, res) => {
  try {
    console.log('------------------------');
    console.log('TEST LOGOUT AUDIT TRIGGERED:');
    console.log('- User:', req.user);
    
    // Directly log the logout action
    console.log('Directly calling AuditService.logLogout...');
    const auditResult = await AuditService.logLogout(req.user.id, req.user.username);
    console.log('AuditService direct result:', auditResult);
    
    // Let's also try the logAction method directly
    console.log('Trying AuditService.logAction directly...');
    const directResult = await AuditService.logAction(
      req.user.id,
      req.user.username,
      'logout',
      'user',
      req.user.id,
      { test: true }
    );
    console.log('Direct logAction result:', directResult);
    
    res.json({ 
      success: true, 
      message: 'Test logout audit triggered',
      auditResult,
      directResult
    });
  } catch (error) {
    console.error('❌ Error in test logout audit:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

module.exports = router;