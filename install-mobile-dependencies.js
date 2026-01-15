#!/usr/bin/env node
// Install Mobile Driver Backend Dependencies
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚛 Installing Mobile Driver Backend Dependencies...\n');

// Change to server directory
const serverDir = path.join(__dirname, 'client', 'server');
process.chdir(serverDir);

// List of dependencies to install
const dependencies = [
  'socket.io@^4.7.4',
  'node-cron@^3.0.2',
  'geolib@^3.3.3',
  'multer@^1.4.5'
];

const devDependencies = [
  'nodemon@^3.0.1'
];

console.log('📦 Installing production dependencies...');
dependencies.forEach(dep => {
  console.log(`   Installing ${dep}...`);
  try {
    execSync(`npm install ${dep}`, { stdio: 'pipe' });
    console.log(`   ✅ ${dep} installed successfully`);
  } catch (error) {
    console.error(`   ❌ Failed to install ${dep}:`, error.message);
  }
});

console.log('\n📦 Installing development dependencies...');
devDependencies.forEach(dep => {
  console.log(`   Installing ${dep}...`);
  try {
    execSync(`npm install --save-dev ${dep}`, { stdio: 'pipe' });
    console.log(`   ✅ ${dep} installed successfully`);
  } catch (error) {
    console.error(`   ❌ Failed to install ${dep}:`, error.message);
  }
});

// Create necessary directories
console.log('\n📁 Creating necessary directories...');
const directories = [
  'uploads',
  'uploads/delivery-proof'
];

directories.forEach(dir => {
  const dirPath = path.join(serverDir, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`   ✅ Created directory: ${dir}`);
  } else {
    console.log(`   📁 Directory already exists: ${dir}`);
  }
});

// Create .gitkeep files for upload directories
const gitkeepDirs = [
  'uploads/delivery-proof'
];

gitkeepDirs.forEach(dir => {
  const gitkeepPath = path.join(serverDir, dir, '.gitkeep');
  if (!fs.existsSync(gitkeepPath)) {
    fs.writeFileSync(gitkeepPath, '# Keep this directory in git\n');
    console.log(`   ✅ Created .gitkeep in: ${dir}`);
  }
});

console.log('\n🎉 Mobile driver backend dependencies installed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Configure Firebase Cloud Messaging (FCM) in your Firebase project');
console.log('2. Add FCM server key to your environment variables');
console.log('3. Test the mobile API endpoints');
console.log('4. Begin mobile app development');

console.log('\n🔧 Available mobile API endpoints:');
console.log('   POST /api/mobile/auth/login');
console.log('   POST /api/mobile/auth/logout');
console.log('   GET  /api/mobile/deliveries/assigned');
console.log('   POST /api/mobile/deliveries/:id/accept');
console.log('   POST /api/mobile/deliveries/:id/start');
console.log('   POST /api/mobile/deliveries/:id/complete');
console.log('   GET  /api/mobile/notifications');
console.log('   POST /api/mobile/driver/location');
console.log('   PUT  /api/mobile/driver/status');

console.log('\n🚀 Ready for mobile driver app development!'); 