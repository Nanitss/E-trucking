const express = require('express');
const cors = require('cors');
const SimpleFileScanner = require('./services/SimpleFileScanner');

const app = express();
const PORT = 5008; // Use different port to avoid conflicts

// Middleware
app.use(cors());
app.use(express.json());

// Simple file scanning endpoint
app.get('/api/simple-files/trucks-with-documents', async (req, res) => {
  try {
    console.log('🔍 Simple test server: File scanning request received');
    
    const trucks = await SimpleFileScanner.getTrucksWithDocuments();
    
    console.log(`✅ Simple test server: Found ${trucks.length} trucks`);
    
    res.json({
      message: 'Trucks with documents retrieved successfully',
      truckCount: trucks.length,
      trucks: trucks
    });
    
  } catch (error) {
    console.error('❌ Simple test server error:', error);
    res.status(500).json({ 
      message: 'Failed to get trucks with documents', 
      error: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Simple test server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Simple test server running on http://localhost:${PORT}`);
  console.log(`📋 File scanning endpoint: http://localhost:${PORT}/api/simple-files/trucks-with-documents`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
});
