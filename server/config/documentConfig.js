const path = require('path');

// Base directory for all document storage - use absolute path to root uploads folder
const DOCUMENT_ROOT = process.env.DOCUMENT_ROOT || path.join(process.cwd(), 'uploads');

// Create uploads directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync(DOCUMENT_ROOT)) {
    fs.mkdirSync(DOCUMENT_ROOT, { recursive: true });
    
    // Create main document type directories
    const documentTypes = {
        'Truck-Documents': [],
        'Driver-Documents': ['ID-Photos', 'Licenses', 'Medical-Certificates', 'NBI-Clearances'],
        'Helper-Documents': ['ID-Photos', 'Licenses', 'Medical-Certificates', 'NBI-Clearances'],
        'Client-Documents': ['Business-Permits']
    };

    // Create all directories and their subdirectories
    Object.entries(documentTypes).forEach(([mainDir, subDirs]) => {
        const mainPath = path.join(DOCUMENT_ROOT, mainDir);
        fs.mkdirSync(mainPath, { recursive: true });
        
        subDirs.forEach(subDir => {
            fs.mkdirSync(path.join(mainPath, subDir), { recursive: true });
        });
    });
}

module.exports = {
    DOCUMENT_ROOT,
    // Helper function to get relative path from document root
    getRelativePath: (fullPath) => {
        return path.relative(DOCUMENT_ROOT, fullPath);
    },
    // Helper function to get absolute path from relative path
    getAbsolutePath: (relativePath) => {
        return path.join(DOCUMENT_ROOT, relativePath);
    }
};
