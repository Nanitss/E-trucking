// fix-firebase-config.js
// Script to help diagnose and fix Firebase configuration issues

require('dotenv').config();

console.log('🔥 Firebase Configuration Diagnostics');
console.log('=====================================');

// Check environment variables
console.log('\n1. Checking Environment Variables:');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing');
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '✅ Set' : '❌ Missing');
console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 
  `✅ Set (length: ${process.env.FIREBASE_PRIVATE_KEY.length} chars)` : '❌ Missing');
console.log('FIREBASE_DATABASE_URL:', process.env.FIREBASE_DATABASE_URL ? '✅ Set' : '❌ Missing');

if (process.env.FIREBASE_PRIVATE_KEY) {
  console.log('\n2. Private Key Analysis:');
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  
  console.log('Raw key starts with:', privateKey.substring(0, 50) + '...');
  console.log('Contains \\n sequences:', privateKey.includes('\\n') ? '✅ Yes' : '❌ No');
  console.log('Contains quotes:', privateKey.includes('"') ? '⚠️ Yes (may cause issues)' : '✅ No');
  console.log('Starts with BEGIN:', privateKey.includes('-----BEGIN') ? '✅ Yes' : '❌ No');
  console.log('Ends with END:', privateKey.includes('-----END') ? '✅ Yes' : '❌ No');
  
  // Try to clean the key
  console.log('\n3. Attempting to clean private key...');
  let cleanedKey = privateKey
    .replace(/\\n/g, '\n')  // Replace \\n with actual newlines
    .replace(/"/g, '')      // Remove quotes
    .trim();               // Remove extra whitespace
    
  console.log('Cleaned key starts with:', cleanedKey.substring(0, 50) + '...');
  console.log('Cleaned key format looks correct:', 
    (cleanedKey.startsWith('-----BEGIN') && cleanedKey.endsWith('-----END PRIVATE KEY-----')) ? 
    '✅ Yes' : '❌ No');
}

console.log('\n4. Recommendations:');
if (!process.env.FIREBASE_PROJECT_ID) {
  console.log('❌ Add FIREBASE_PROJECT_ID to your .env file');
}
if (!process.env.FIREBASE_CLIENT_EMAIL) {
  console.log('❌ Add FIREBASE_CLIENT_EMAIL to your .env file');
}
if (!process.env.FIREBASE_PRIVATE_KEY) {
  console.log('❌ Add FIREBASE_PRIVATE_KEY to your .env file');
} else {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!privateKey.includes('-----BEGIN')) {
    console.log('⚠️ Private key should start with -----BEGIN PRIVATE KEY-----');
  }
  if (privateKey.includes('"')) {
    console.log('⚠️ Remove quotes from private key in .env file');
  }
  if (!privateKey.includes('\\n')) {
    console.log('⚠️ Private key should contain \\n sequences for line breaks');
  }
}

console.log('\n5. Next Steps:');
console.log('✅ Check your .env file in the client/server directory');
console.log('✅ Make sure private key is properly formatted');
console.log('✅ Restart the server after fixing environment variables');
console.log('✅ The private key should look like this in .env:');
console.log('   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\\n-----END PRIVATE KEY-----"');

console.log('\n=====================================');
console.log('🔥 Diagnostics Complete');
