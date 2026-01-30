import React, { useState } from "react";
import "./FileViewer.css";

const FileViewer = ({ documents, truckPlate }) => {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showFileModal, setShowFileModal] = useState(false);

  const handleFileView = (docType, document) => {
    setSelectedDoc({ docType, document });
    setShowFileModal(true);
  };

  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  const handleFileDownload = (docType, document) => {
    if (document && (document.fullPath || document.filename)) {
      try {
        console.log("📄 handleFileDownload called");
        console.log("Document object:", document);
        console.log("docType:", docType);

        // Use the filename directly from the scanned document
        // The scan now returns the actual filename from the file system
        let finalFilename = document.filename;

        // Fallback: if no filename but has fullPath, extract from path
        if (!finalFilename && document.fullPath) {
          const pathParts = document.fullPath.split(/[\\\/]/);
          finalFilename = pathParts[pathParts.length - 1];
        }

        console.log("✅ Using filename:", finalFilename);

        // Determine the correct subfolder based on document type
        let subfolder = "";
        const docTypeLower = docType.toLowerCase();

        // Truck documents (don't change these!)
        if (docTypeLower.includes("or") || docTypeLower.includes("cr")) {
          subfolder = "OR-CR-Files";
        } else if (docTypeLower.includes("insurance")) {
          subfolder = "Insurance-Papers";
        }
        // Driver documents
        else if (
          docTypeLower.includes("idphoto") ||
          docTypeLower === "id-photos"
        ) {
          subfolder = "ID-Photos";
        } else if (
          docTypeLower.includes("license") &&
          !docTypeLower.includes("nbi")
        ) {
          subfolder = "Licenses";
        } else if (docTypeLower.includes("medical")) {
          subfolder = "Medical-Certificates";
        } else if (docTypeLower.includes("nbi")) {
          subfolder = "NBI-Clearances";
        }
        // Client documents
        else if (
          docTypeLower.includes("permit") ||
          docTypeLower === "business-permits"
        ) {
          subfolder = "Business-Permits";
        }

        // Determine the main document folder
        let mainFolder = "";
        if (document.fullPath) {
          if (document.fullPath.includes("Truck-Documents")) {
            mainFolder = "Truck-Documents";
          } else if (document.fullPath.includes("Driver-Documents")) {
            mainFolder = "Driver-Documents";
          } else if (document.fullPath.includes("Helper-Documents")) {
            mainFolder = "Helper-Documents";
          } else if (document.fullPath.includes("Client-Documents")) {
            mainFolder = "Client-Documents";
          } else if (document.fullPath.includes("Staff-Documents")) {
            mainFolder = "Staff-Documents";
          } else {
            // Default to Driver-Documents for driver docs
            mainFolder = "Driver-Documents";
          }
        } else {
          // If no fullPath, assume Driver-Documents based on docType
          mainFolder = "Driver-Documents";
        }

        // Construct the relative path using the actual filename
        const relativePath = subfolder
          ? `${mainFolder}/${subfolder}/${finalFilename}`
          : `${mainFolder}/${finalFilename}`;

        // Create the API URL for viewing the document - encode each path part separately
        const encodedPath = relativePath
          .split("/")
          .map((part) => encodeURIComponent(part))
          .join("/");
        const apiUrl = `/api/documents/view/${encodedPath}`;
        console.log("🔗 API URL:", apiUrl);
        console.log("📁 Main folder:", mainFolder);
        console.log("📂 Subfolder:", subfolder);
        console.log("📄 Filename:", finalFilename);

        // Check if it's an image
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(finalFilename);

        if (isImage) {
          setSelectedImage(apiUrl);
          setShowImageModal(true);
        } else {
          // For non-image files, try to open in new tab
          window.open(apiUrl, "_blank");
        }
      } catch (error) {
        console.error("Error opening file:", error);
        alert("Error opening the document. Please try again.");
      }
    }
  };

  const handleOpenFileLocation = (document) => {
    if (document && document.fullPath) {
      try {
        // Try to open the folder containing the file
        const folderPath = document.fullPath.substring(
          0,
          document.fullPath.lastIndexOf("\\")
        );
        // Use Windows shell command to open folder
        if (navigator.platform.includes("Win")) {
          // For Windows, we can try to open the folder
          alert(
            `Opening folder: ${folderPath}\n\nIf the folder doesn't open automatically, please:\n1. Press Win + R\n2. Type: explorer "${folderPath}"\n3. Press Enter`
          );
        } else {
          alert(`File location: ${document.fullPath}`);
        }
      } catch (error) {
        console.error("Error opening folder:", error);
        alert(`File location: ${document.fullPath}`);
      }
    }
  };

  const getDocumentIcon = (docType) => {
    switch (docType.toLowerCase()) {
      // Truck Documents
      case "orDocument":
      case "or-cr-files":
        return "📄";
      case "crDocument":
        return "📋";
      case "insuranceDocument":
      case "insurance-papers":
        return "🛡️";
      case "licenseRequirement":
        return "🚗";

      // Driver/Helper Documents
      case "id-photos":
        return "🪪";
      case "licenses":
        return "📜";
      case "medical-certificates":
        return "🏥";
      case "nbi-clearances":
        return "👮";

      // Client Documents
      case "business-permits":
        return "📑";

      default:
        return "📎";
    }
  };

  const getDocumentName = (docType) => {
    switch (docType.toLowerCase()) {
      // Truck Documents
      case "orDocument":
      case "or-cr-files":
        return "OR/CR Files";
      case "crDocument":
        return "Certificate of Registration";
      case "insuranceDocument":
      case "insurance-papers":
        return "Insurance Papers";
      case "licenseRequirement":
        return "License Requirement";

      // Driver/Helper Documents
      case "id-photos":
        return "ID Photos";
      case "licenses":
        return "Licenses";
      case "medical-certificates":
        return "Medical Certificates";
      case "nbi-clearances":
        return "NBI Clearances";

      // Client Documents
      case "business-permits":
        return "Business Permits";

      default:
        // Convert hyphenated names to title case
        return docType
          .split("-")
          .map(
            (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          )
          .join(" ");
    }
  };

  const getFileTypeIcon = (filename) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "pdf":
        return "📄";
      case "png":
      case "jpg":
      case "jpeg":
      case "gif":
      case "webp":
        return "🖼️";
      case "doc":
      case "docx":
        return "📝";
      case "xls":
      case "xlsx":
        return "📊";
      default:
        return "📎";
    }
  };

  const isImageFile = (filename) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    return ["png", "jpg", "jpeg", "gif", "webp"].includes(ext);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const closeFileModal = () => {
    setShowFileModal(false);
    setSelectedDoc(null);
  };

  if (!documents || Object.keys(documents).length === 0) {
    return (
      <div className="file-viewer">
        <p className="no-documents">No documents uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="file-viewer">
      <div className="documents-simple-list">
        {Object.entries(documents).map(([docType, document]) => {
          if (!document || !document.fullPath) return null;

          return (
            <div key={docType} className="document-simple-item">
              <div className="document-simple-info">
                <span className="document-simple-icon">
                  {getDocumentIcon(docType)}
                </span>
                <div className="document-simple-text">
                  <span className="document-simple-label">
                    {getDocumentName(docType)}
                  </span>
                  <span className="document-simple-name">
                    {document.originalName || document.filename}
                  </span>
                </div>
              </div>
              <button
                className="document-view-btn"
                onClick={() => handleFileDownload(docType, document)}
                title="View Document"
              >
                View
              </button>
            </div>
          );
        })}
      </div>

      {/* File Details Modal */}
      {showFileModal && selectedDoc && (
        <div className="file-modal-overlay" onClick={closeFileModal}>
          <div className="file-modal" onClick={(e) => e.stopPropagation()}>
            <div className="file-modal-header">
              <h3>📄 {getDocumentName(selectedDoc.docType)}</h3>
              <button className="modal-close" onClick={closeFileModal}>
                ✕
              </button>
            </div>

            <div className="file-modal-content">
              <div className="file-preview">
                {isImageFile(selectedDoc.document.filename) ? (
                  <div className="image-preview">
                    <img
                      src={`file://${selectedDoc.document.fullPath}`}
                      alt={selectedDoc.document.filename}
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "block";
                      }}
                    />
                    <div className="image-fallback" style={{ display: "none" }}>
                      <div className="fallback-icon">🖼️</div>
                      <p>Image Preview Unavailable</p>
                      <p className="fallback-text">
                        File: {selectedDoc.document.filename}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="file-icon-preview">
                    <div className="large-file-icon">
                      {getFileTypeIcon(selectedDoc.document.filename)}
                    </div>
                    <p className="file-type-text">
                      {selectedDoc.document.filename
                        .split(".")
                        .pop()
                        ?.toUpperCase()}{" "}
                      File
                    </p>
                  </div>
                )}
              </div>

              <div className="file-details">
                <div className="detail-section">
                  <h4>📋 File Information</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Document Type:</span>
                      <span className="detail-value">
                        {getDocumentName(selectedDoc.docType)}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">File Name:</span>
                      <span className="detail-value">
                        {selectedDoc.document.filename}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">File Size:</span>
                      <span className="detail-value">
                        {formatFileSize(selectedDoc.document.fileSize)}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Upload Date:</span>
                      <span className="detail-value">
                        {new Date(
                          selectedDoc.document.uploadDate
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Last Modified:</span>
                      <span className="detail-value">
                        {new Date(
                          selectedDoc.document.lastModified
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">MIME Type:</span>
                      <span className="detail-value">
                        {selectedDoc.document.mimeType}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>📁 File Location</h4>
                  <div className="file-path-display">
                    <p className="path-label">Full Path:</p>
                    <p className="path-value">
                      {selectedDoc.document.fullPath}
                    </p>
                    <p className="path-label">Relative Path:</p>
                    <p className="path-value">
                      {selectedDoc.document.relativePath}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="file-modal-footer">
              <button
                className="btn-primary"
                onClick={() =>
                  handleFileDownload(selectedDoc.docType, selectedDoc.document)
                }
              >
                📄 View Document
              </button>
              <button
                className="btn-secondary"
                onClick={() => handleOpenFileLocation(selectedDoc.document)}
              >
                📍 Show Location
              </button>
              <button className="btn-close" onClick={closeFileModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Image Modal */}
      {showImageModal && selectedImage && (
        <div className="modal-overlay">
          <div className="image-modal">
            <div className="image-modal-header">
              <h3>Document Preview</h3>
              <button
                className="close-button"
                onClick={() => {
                  setShowImageModal(false);
                  setSelectedImage(null);
                }}
              >
                ✕
              </button>
            </div>
            <div className="image-modal-content">
              <img
                src={selectedImage}
                alt="Document Preview"
                style={{ maxWidth: "100%", maxHeight: "80vh" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileViewer;
