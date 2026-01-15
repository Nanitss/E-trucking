const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = 5009; // Use port 5009 to avoid any conflicts

// Middleware
app.use(cors());
app.use(express.json());

// Base path to your Documents folder
const DOCUMENTS_BASE_PATH = path.join(os.homedir(), 'Documents', 'TruckingApp-Files');
const TRUCK_DOCS_PATH = path.join(DOCUMENTS_BASE_PATH, 'Truck-Documents');

// Simple file scanning function
function scanTruckDocuments() {
  try {
    console.log('🔍 Scanning documents from:', TRUCK_DOCS_PATH);
    
    if (!fs.existsSync(TRUCK_DOCS_PATH)) {
      console.log('❌ Truck documents folder not found');
      return [];
    }

    const allFiles = [];
    const subfolders = fs.readdirSync(TRUCK_DOCS_PATH);
    
    subfolders.forEach(folder => {
      const folderPath = path.join(TRUCK_DOCS_PATH, folder);
      
      if (fs.statSync(folderPath).isDirectory()) {
        try {
          const files = fs.readdirSync(folderPath);
          
          files.forEach(file => {
            const filePath = path.join(folderPath, file);
            const stats = fs.statSync(filePath);
            
            allFiles.push({
              filename: file,
              folder: folder,
              fullPath: filePath,
              size: stats.size,
              modified: stats.mtime
            });
          });
        } catch (error) {
          console.error(`❌ Error reading folder ${folder}:`, error);
        }
      }
    });

    // Group files by truck plate number
    const trucksByPlate = {};
    
    allFiles.forEach(file => {
      // Extract truck plate from filename (format: YYYY-MM-DD_PLATE_DOCUMENTTYPE.ext)
      const parts = file.filename.split('_');
      if (parts.length >= 3) {
        const plate = parts[1]; // Second part is the plate number
        
        if (!trucksByPlate[plate]) {
          trucksByPlate[plate] = [];
        }
        
        trucksByPlate[plate].push(file);
      }
    });

    // Convert to truck objects
    const trucks = [];
    
    Object.entries(trucksByPlate).forEach(([plate, files]) => {
      const documents = {};
      let documentCount = 0;
      let requiredCount = 0;
      let optionalCount = 0;
      
      // Organize files by document type
      files.forEach(file => {
        let docType = 'unknown';
        
        if (file.folder === 'OR-CR-Files') {
          if (file.filename.includes('_OR')) docType = 'orDocument';
          else if (file.filename.includes('_CR')) docType = 'crDocument';
        } else if (file.folder === 'Insurance-Papers') {
          if (file.filename.includes('_INSURANCE')) docType = 'insuranceDocument';
        } else if (file.folder === 'License-Documents') {
          if (file.filename.includes('_LICENSE-REQ')) docType = 'licenseRequirement';
        }
        
        if (docType !== 'unknown') {
          documents[docType] = {
            filename: file.filename,
            originalName: file.filename,
            fullPath: file.fullPath,
            relativePath: path.join(file.folder, file.filename),
            uploadDate: file.modified.toISOString(),
            fileSize: file.size,
            mimeType: getMimeType(file.filename),
            documentType: docType,
            lastModified: file.modified.toISOString()
          };
          
          documentCount++;
          
          if (docType === 'licenseRequirement') {
            optionalCount++;
          } else {
            requiredCount++;
          }
        }
      });
      
      // Calculate overall status
      let overallStatus = 'missing';
      if (requiredCount === 3) {
        overallStatus = 'complete';
      } else if (documentCount > 0) {
        overallStatus = 'incomplete';
      }
      
      const truck = {
        id: `truck-${plate}-${Date.now()}`,
        truckPlate: plate,
        truckType: 'Unknown',
        truckCapacity: 'Unknown',
        truckBrand: 'Unknown',
        documents: documents,
        documentCompliance: {
          orDocument: documents.orDocument ? 'complete' : 'missing',
          crDocument: documents.crDocument ? 'complete' : 'missing',
          insuranceDocument: documents.insuranceDocument ? 'complete' : 'missing',
          licenseRequirement: documents.licenseRequirement ? 'complete' : 'optional',
          overallStatus: overallStatus,
          documentCount: documentCount,
          requiredDocumentCount: requiredCount,
          optionalDocumentCount: optionalCount
        },
        truckStatus: 'available',
        allocationStatus: 'available',
        operationalStatus: 'active',
        isAvailable: true,
        isAllocated: false,
        isInUse: false,
        needsMaintenance: false,
        statusSummary: 'Available for Allocation'
      };
      
      trucks.push(truck);
    });

    console.log(`✅ Found ${trucks.length} trucks with documents`);
    return trucks;
    
  } catch (error) {
    console.error('❌ Error scanning documents:', error);
    return [];
  }
}

// Helper function to get MIME type
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.txt': 'text/plain'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// File scanning endpoint
app.get('/api/simple-files/trucks-with-documents', (req, res) => {
  try {
    console.log('🔍 File scanning request received');
    
    const trucks = scanTruckDocuments();
    
    res.json({
      message: 'Trucks with documents retrieved successfully',
      truckCount: trucks.length,
      trucks: trucks
    });
    
  } catch (error) {
    console.error('❌ Error in file scanning endpoint:', error);
    res.status(500).json({ 
      message: 'Failed to get trucks with documents', 
      error: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Working file server is running',
    documentsPath: TRUCK_DOCS_PATH,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Working file server running on http://localhost:${PORT}`);
  console.log(`📋 File scanning endpoint: http://localhost:${PORT}/api/simple-files/trucks-with-documents`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`📁 Scanning documents from: ${TRUCK_DOCS_PATH}`);
});
