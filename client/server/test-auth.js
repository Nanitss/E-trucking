// test-auth.js - Place this in your server folder
require('dotenv').config(); // Load environment variables
const bcrypt = require('bcryptjs');
const pool = require('./config/db'); // Adjust this path if needed

async function testAuthentication() {
  // Test username and password
  const testUsername = 'admin';
  const testPassword = 'admin123';
  
  console.log('Testing authentication with:', { testUsername, testPassword });
  
  try {
    // 1. Check if the user exists
    console.log('Querying database for user...');
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [testUsername]);
    
    if (users.length === 0) {
      console.log('❌ ERROR: User not found in database!');
      
      // Suggest creating a user
      console.log('\nSuggestion: Create a user with this query:');
      // Generate a properly hashed password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(testPassword, salt);
      console.log(`
      INSERT INTO users (username, password, role, status) 
      VALUES ('${testUsername}', '${hashedPassword}', 'admin', 'active');
      `);
      return;
    }
    
    const user = users[0];
    console.log('✅ User found:', { id: user.id, username: user.username, role: user.role, status: user.status });
    
    // 2. Check if status is active
    if (user.status !== 'active') {
      console.log(`❌ ERROR: User status is "${user.status}", not "active"!`);
      console.log('\nSuggestion: Update user status with this query:');
      console.log(`
      UPDATE users SET status = 'active' WHERE id = ${user.id};
      `);
      return;
    }
    console.log('✅ User status is active');
    
    // 3. Test password match
    console.log('\nTesting password...');
    const isMatch = await bcrypt.compare(testPassword, user.password);
    
    if (!isMatch) {
      console.log('❌ ERROR: Password does not match!');
      
      // Suggest updating password
      console.log('\nSuggestion: Update password with this query:');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(testPassword, salt);
      console.log(`
      UPDATE users SET password = '${hashedPassword}' WHERE id = ${user.id};
      `);
      
      // Debug: Show the stored hash vs a new hash
      console.log('\nDebug info:');
      console.log('Stored hash:', user.password);
      console.log('Generated hash for same password:', hashedPassword);
      return;
    }
    
    console.log('✅ Password matched successfully!');
    console.log('\n🎉 Authentication test PASSED! Your login should work.');
  } catch (error) {
    console.error('❌ ERROR during test:', error);
    console.log('\nCheck your database connection and configuration.');
  } finally {
    // Close the database connection
    pool.end();
  }
}

testAuthentication();