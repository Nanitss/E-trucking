const bcrypt = require('bcrypt');

// Generate a hash for "password123"
const password = 'password123';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, function(err, hash) {
  if (err) {
    console.error('Error generating hash:', err);
    return;
  }
  console.log('Generated hash:', hash);
  
  // Test that it works
  bcrypt.compare(password, hash, function(err, result) {
    console.log('Password matches:', result);
  });
});