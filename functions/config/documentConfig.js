const path = require('path');
const os = require('os');
const fs = require('fs');

// Base directory for all document storage
// In Cloud Functions, we must use /tmp (the only writable directory)
// Detect Cloud Functions environment by checking for known environment variables
const isCloudFunctions = process.env.FUNCTION_TARGET || process.env.K_SERVICE;

let DOCUMENT_ROOT;
if (isCloudFunctions) {
    // Cloud Functions: use /tmp directory
    DOCUMENT_ROOT = path.join(os.tmpdir(), 'uploads');
} else {
    // Local development: use the project's uploads folder
    DOCUMENT_ROOT = process.env.DOCUMENT_ROOT || path.join(__dirname, '..', '..', '..', 'uploads');
}

// Create uploads directory if it doesn't exist
try {
    if (!fs.existsSync(DOCUMENT_ROOT)) {
        fs.mkdirSync(DOCUMENT_ROOT, { recursive: true });

        // Create main document type directories
        const documentTypes = {
            'Truck-Documents': ['OR-CR-Files', 'Insurance-Papers'],
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
} catch (error) {
    console.warn('⚠️ Could not create document directories:', error.message);
    console.log('📁 Document uploads may not work correctly');
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
