const fs = require('fs');
const path = require('path');

const setupFolders = () => {
  const folders = [
    'uploads',
    'uploads/driver-documents',
    'uploads/helper-documents',
    'uploads/operator-documents',
    'uploads/staff-documents'
  ];

  folders.forEach(folder => {
    const folderPath = path.join(__dirname, '..', folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
      console.log(`Created folder: ${folderPath}`);
    }
  });
};

module.exports = setupFolders;