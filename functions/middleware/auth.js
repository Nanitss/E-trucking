const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');
require('dotenv').config();

async function authenticateJWT(req, res, next) {
  console.log('🔒 authenticateJWT middleware called');

  // Debug headers
  const headersToLog = { ...req.headers };
  if (headersToLog.authorization) {
    headersToLog.authorization = headersToLog.authorization.substring(0, 20) + '...';
  }
  console.log('🔒 Headers:', headersToLog);

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    console.log('❌ No Bearer token in request headers');
    return res.status(401).json({ message: 'Missing token' });
  }

  const token = authHeader.split(' ')[1];
  console.log('🔒 Token received (first 20 chars):', token.substring(0, 20) + '...');
  console.log('🔒 Token length:', token.length);

  // Add extra debug to check JWT secret
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-for-development';
  console.log('🔒 Using JWT secret (length):', jwtSecret.length);

  try {
    const decoded = jwt.verify(token, jwtSecret);
    console.log('✅ Token verified, decoded payload:', decoded);
    console.log('✅ Decoded token type:', typeof decoded);
    console.log('✅ Token verification successful');

    // Extract user from various possible formats
    if (decoded.user) {
      // Format: { user: { id: '123', ... } }
      req.user = decoded.user;
      console.log('🔒 Using user from decoded.user:', req.user);
    } else if (decoded.id) {
      // Format: { id: '123', ... }
      req.user = decoded;
      console.log('🔒 Using user from decoded root:', req.user);
    } else {
      console.log('❌ No user data found in token payload:', decoded);
      return res.status(401).json({ message: 'Invalid token format' });
    }

    console.log('✅ User attached to request:', req.user);
    console.log('✅ User role:', req.user.role);

    // If user is a client, also attach the clientId
    if (req.user.role === 'client') {
      console.log('🔍 User is a client, looking up clientId...');
      console.log('🔍 User ID:', req.user.id);
      console.log('🔍 User email:', req.user.email);
      try {
        let clientDoc = null;
        let clientId = null;

        // Strategy 1: Look up by userId field
        const clientByUserIdSnapshot = await db.collection('clients')
          .where('userId', '==', req.user.id)
          .limit(1)
          .get();

        if (!clientByUserIdSnapshot.empty) {
          clientDoc = clientByUserIdSnapshot.docs[0];
          clientId = clientDoc.id;
          console.log('✅ Found client by userId field:', clientId);
        }

        // Strategy 2: If not found, try by email field
        if (!clientId && req.user.email) {
          const clientByEmailSnapshot = await db.collection('clients')
            .where('email', '==', req.user.email)
            .limit(1)
            .get();

          if (!clientByEmailSnapshot.empty) {
            clientDoc = clientByEmailSnapshot.docs[0];
            clientId = clientDoc.id;
            console.log('✅ Found client by email:', clientId);
          }
        }

        // Strategy 3: Check if user's ID is actually the client document ID
        if (!clientId) {
          const clientDirectDoc = await db.collection('clients').doc(req.user.id).get();
          if (clientDirectDoc.exists) {
            clientDoc = clientDirectDoc;
            clientId = clientDirectDoc.id;
            console.log('✅ Found client by document ID (user ID = client doc ID):', clientId);
          }
        }

        if (clientId) {
          req.user.clientId = clientId;
          console.log('✅ Client ID attached to request:', req.user.clientId);
        } else {
          console.log('⚠️ No client document found for user:', req.user.id);
          console.log('⚠️ Tried userId field, email field, and direct document ID');
        }
      } catch (clientLookupError) {
        console.error('❌ Error looking up clientId:', clientLookupError);
      }
    }

    next();
  } catch (err) {
    console.error('❌ JWT verification error:', err.message);
    console.error('❌ JWT verification error type:', err.name);
    console.error('❌ JWT verification error details:', err);
    return res.status(403).json({ message: 'Invalid token' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    console.log('🔒 requireRole middleware called, required role:', role);
    console.log('🔒 User role:', req.user?.role);

    if (!req.user) {
      console.log('❌ No user on request');
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (req.user.role !== role) {
      console.log('❌ User role does not match required role');
      return res.status(403).json({ message: 'Access denied' });
    }

    console.log('✅ Role check passed');
    next();
  };
}

// Client-specific middleware that only allows clients or admins to access
function requireClientOrAdmin(req, res, next) {
  console.log('🔒 requireClientOrAdmin middleware called');
  console.log('🔒 User role:', req.user?.role);

  if (!req.user) {
    console.log('❌ No user on request');
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.user.role !== 'client' && req.user.role !== 'admin') {
    console.log('❌ User is neither client nor admin');
    return res.status(403).json({ message: 'Access denied. Only clients or admins can access this resource.' });
  }

  console.log('✅ Client/Admin role check passed');
  next();
}

// Admin-specific middleware
function isAdmin(req, res, next) {
  console.log('🔒 isAdmin middleware called');
  console.log('🔒 User role:', req.user?.role);

  if (!req.user) {
    console.log('❌ No user on request');
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    console.log('❌ User is not admin');
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }

  console.log('✅ Admin role check passed');
  next();
}

module.exports = { authenticateJWT, requireRole, requireClientOrAdmin, isAdmin };
