// Firebase-compatible authentication middleware
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');

// Authenticate JWT token middleware
const authenticate = async (req, res, next) => {
  console.log('🔒 authenticate middleware called');
  console.log('🔒 Headers:', req.headers);

  // Extract token from headers
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ No Bearer token in request headers');
    return res.status(401).json({ message: 'Authentication failed: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  console.log('🔒 Token received (first 20 chars):', token.substring(0, 20) + '...');
  
  if (!token) {
    console.log('❌ Token extraction failed');
    return res.status(401).json({ message: 'Authentication failed: Invalid token format' });
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-for-development');
    console.log('✅ Token verified, decoded payload:', decoded);
    
    // Extract user ID from various possible formats
    let userId;
    
    if (decoded.user && decoded.user.id) {
      // Format: { user: { id: '123', ... } }
      userId = decoded.user.id;
      console.log('🔒 Found user ID in decoded.user.id:', userId);
    } else if (decoded.id) {
      // Format: { id: '123', ... }
      userId = decoded.id;
      console.log('🔒 Found user ID in decoded.id:', userId);
    } else if (decoded.sub) {
      // Format: { sub: '123', ... } (JWT standard)
      userId = decoded.sub;
      console.log('🔒 Found user ID in decoded.sub:', userId);
    } else {
      console.log('❌ No user ID found in token payload:', decoded);
      return res.status(401).json({ message: 'Authentication failed: Invalid token format' });
    }
    
    // Verify the user exists in Firestore
    console.log('🔍 Looking up user in Firestore, ID:', userId);
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.log('❌ User not found in Firestore, ID:', userId);
      return res.status(401).json({ message: 'Authentication failed: User not found' });
    }

    // Extract user data
    const userData = userDoc.data();
    console.log('✅ User found in Firestore:', {
      id: userId,
      username: userData.username,
      role: userData.role
    });
    
    // Check if user is active
    if (userData.status !== 'active') {
      console.log('❌ User account is not active, status:', userData.status);
      return res.status(403).json({ message: 'Authentication failed: Account is inactive' });
    }

    // Add user to request
    req.user = {
      id: userId,
      username: userData.username,
      role: userData.role
    };
    
    // If user is a client, also attach the clientId
    if (userData.role === 'client') {
      console.log('🔍 User is a client, looking up clientId...');
      const clientSnapshot = await db.collection('clients')
        .where('userId', '==', userId)
        .limit(1)
        .get();
      
      if (!clientSnapshot.empty) {
        const clientDoc = clientSnapshot.docs[0];
        req.user.clientId = clientDoc.id;
        console.log('✅ Client ID attached:', req.user.clientId);
      } else {
        console.log('⚠️ No client document found for user:', userId);
      }
    }
    
    console.log('✅ User attached to request:', req.user);
    
    // Proceed to next middleware
    console.log('✅ Authentication successful, proceeding to next middleware');
    next();
  } catch (error) {
    console.error('❌ JWT verification error:', error.message);
    
    // Check for specific JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Authentication failed: Token expired' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Authentication failed: Invalid token' });
    }
    
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

module.exports = authenticate;