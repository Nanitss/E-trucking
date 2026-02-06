/**
 * ReceiptService
 * Generates PDF payment receipts for approved payment proofs
 * Uses pdfkit for professional PDF generation with company branding
 */

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const PDFDocument = require("pdfkit");

const db = admin.firestore();

class ReceiptService {
  constructor() {
    // Use persistent folder within the project (persists across restarts)
    // Path is relative to the functions directory: ../uploads/receipts
    this.basePath = path.join(__dirname, "..", "uploads", "receipts");
    this.ensureBaseDirectory();
    console.log(
      "✅ Using persistent local storage for receipts:",
      this.basePath,
    );
  }

  ensureBaseDirectory() {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
    }
  }

  /**
   * Generate a receipt for an approved payment proof
   * @param {Object} proofData - The approved payment proof data
   * @param {Array} deliveries - Array of delivery objects that were paid
   * @param {Object} adminInfo - Admin who approved the payment
   * @returns {Object} Receipt data with file path
   */
  async generateReceipt(proofData, deliveries, adminInfo) {
    try {
      const receiptNumber = this.generateReceiptNumber();
      const now = new Date();

      // Get client info
      const clientDoc = await db
        .collection("clients")
        .doc(proofData.clientId)
        .get();
      const clientData = clientDoc.exists ? clientDoc.data() : {};

      // Build receipt data
      const receiptData = {
        receiptNumber,
        generatedAt: now,
        clientId: proofData.clientId,
        clientName:
          clientData.name ||
          clientData.companyName ||
          proofData.clientName ||
          "Client",
        clientEmail: clientData.email || "",
        proofId: proofData.id,
        totalAmount: proofData.totalAmount,
        deliveries: deliveries.map((d) => ({
          id: d.id,
          deliveryDate: d.deliveryDate,
          amount: d.amount || d.deliveryRate || d.DeliveryRate || 0,
          truckPlate: d.truckPlate || d.TruckPlate,
          pickupLocation: d.pickupLocation,
          deliveryAddress: d.deliveryAddress || d.dropoffLocation,
        })),
        approvedBy: adminInfo.username,
        approvedAt: now,
        referenceNumber: proofData.referenceNumber || this.generateReferenceNumber(),
      };

      // Generate PDF receipt
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const receiptDir = path.join(this.basePath, String(year), month);

      if (!fs.existsSync(receiptDir)) {
        fs.mkdirSync(receiptDir, { recursive: true });
      }

      const fileName = `receipt_${receiptNumber}.pdf`;
      const filePath = path.join(receiptDir, fileName);
      const relativePath = path.relative(this.basePath, filePath);

      await this.generatePDFReceipt(receiptData, filePath);

      // Save receipt record to Firestore
      const receiptRef = await db.collection("paymentReceipts").add({
        receiptNumber,
        proofId: proofData.id,
        clientId: proofData.clientId,
        clientName: receiptData.clientName,
        totalAmount: receiptData.totalAmount,
        deliveryIds: proofData.deliveryIds,
        deliveryCount: proofData.deliveryIds.length,
        approvedBy: adminInfo.id,
        approvedByName: adminInfo.username,
        filePath: relativePath,
        fileType: "application/pdf",
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ PDF Receipt generated: ${receiptNumber}`);

      return {
        success: true,
        receiptId: receiptRef.id,
        receiptNumber,
        filePath: relativePath,
      };
    } catch (error) {
      console.error("❌ Error generating receipt:", error);
      throw error;
    }
  }

  /**
   * Generate a unique receipt number
   */
  generateReceiptNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return `RCP-${year}${month}${day}-${random}`;
  }

  /**
   * Generate an auto reference number when client doesn't provide one
   */
  generateReferenceNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, "0");
    return `REF-${year}${month}${day}-${random}`;
  }

  /**
   * Format currency for the receipt
   */
  formatCurrency(amount) {
    return `PHP ${Number(amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Format date for the receipt
   * Handles: Date objects, Firestore Timestamps, serialized timestamps, ISO strings
   */
  formatDate(date) {
    if (!date) return "N/A";
    let d;
    if (date instanceof Date) {
      d = date;
    } else if (date?.toDate && typeof date.toDate === 'function') {
      d = date.toDate();
    } else if (date?._seconds) {
      d = new Date(date._seconds * 1000);
    } else if (date?.seconds) {
      d = new Date(date.seconds * 1000);
    } else {
      d = new Date(date);
    }
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  /**
   * Generate PDF receipt using pdfkit
   */
  async generatePDFReceipt(data, filePath) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margins: { top: 40, bottom: 40, left: 50, right: 50 },
          info: {
            Title: `Payment Receipt - ${data.receiptNumber}`,
            Author: "E-Trucking Management System",
            Subject: "Payment Receipt",
          },
        });

        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

        // ═══════════════════════════════════════
        // HEADER - Company branding
        // ═══════════════════════════════════════
        doc.rect(0, 0, doc.page.width, 120).fill("#1e40af");

        // Company name
        doc.fontSize(24).font("Helvetica-Bold").fillColor("#ffffff");
        doc.text("E-Trucking Management System", 50, 35, { width: pageWidth });

        // Subtitle
        doc.fontSize(12).font("Helvetica").fillColor("#bfdbfe");
        doc.text("Official Payment Receipt", 50, 65, { width: pageWidth });

        // PAID badge on the right
        const badgeX = doc.page.width - 150;
        doc.roundedRect(badgeX, 40, 100, 30, 15).fill("#22c55e");
        doc.fontSize(12).font("Helvetica-Bold").fillColor("#ffffff");
        doc.text("PAID", badgeX, 48, { width: 100, align: "center" });

        // Company address line
        doc.fontSize(9).font("Helvetica").fillColor("#93c5fd");
        doc.text("Trusted Trucking & Logistics Services", 50, 90, { width: pageWidth });

        // ═══════════════════════════════════════
        // RECEIPT INFO SECTION
        // ═══════════════════════════════════════
        let yPos = 140;

        // Receipt number and date row
        doc.fontSize(16).font("Helvetica-Bold").fillColor("#111827");
        doc.text(`Receipt #${data.receiptNumber}`, 50, yPos);

        doc.fontSize(10).font("Helvetica").fillColor("#6b7280");
        doc.text(`Generated on ${this.formatDate(data.generatedAt)}`, 50, yPos + 22);

        yPos += 55;

        // ═══════════════════════════════════════
        // META INFO GRID (2 columns)
        // ═══════════════════════════════════════
        const colWidth = (pageWidth - 15) / 2;
        const metaItems = [
          { label: "CLIENT NAME", value: data.clientName },
          { label: "REFERENCE NUMBER", value: data.referenceNumber },
          { label: "APPROVED BY", value: data.approvedBy },
          { label: "APPROVAL DATE", value: this.formatDate(data.approvedAt) },
        ];

        metaItems.forEach((item, index) => {
          const col = index % 2;
          const row = Math.floor(index / 2);
          const x = 50 + col * (colWidth + 15);
          const y = yPos + row * 55;

          // Background box
          doc.roundedRect(x, y, colWidth, 45, 6).fill("#f9fafb");

          // Label
          doc.fontSize(8).font("Helvetica-Bold").fillColor("#6b7280");
          doc.text(item.label, x + 12, y + 8, { width: colWidth - 24 });

          // Value
          doc.fontSize(11).font("Helvetica-Bold").fillColor("#111827");
          doc.text(item.value || "N/A", x + 12, y + 22, { width: colWidth - 24 });
        });

        yPos += 125;

        // ═══════════════════════════════════════
        // DELIVERIES TABLE
        // ═══════════════════════════════════════
        doc.fontSize(10).font("Helvetica-Bold").fillColor("#6b7280");
        doc.text(`PAID DELIVERIES (${data.deliveries.length})`, 50, yPos);
        yPos += 20;

        // Table header
        const tableX = 50;
        const colWidths = [30, 140, 80, 110, 100];
        const headers = ["#", "Delivery ID", "Truck", "Date", "Amount"];

        doc.rect(tableX, yPos, pageWidth, 25).fill("#f3f4f6");
        doc.fontSize(8).font("Helvetica-Bold").fillColor("#6b7280");

        let headerX = tableX + 8;
        headers.forEach((header, i) => {
          const align = i === headers.length - 1 ? "right" : "left";
          const textX = i === headers.length - 1 ? headerX - 8 : headerX;
          doc.text(header, textX, yPos + 8, {
            width: colWidths[i],
            align,
          });
          headerX += colWidths[i];
        });

        yPos += 25;

        // Table rows
        data.deliveries.forEach((delivery, index) => {
          // Alternate row background
          if (index % 2 === 0) {
            doc.rect(tableX, yPos, pageWidth, 28).fill("#fafafa");
          }

          doc.fontSize(9).font("Helvetica").fillColor("#374151");

          let cellX = tableX + 8;

          // Row number
          doc.text(`${index + 1}`, cellX, yPos + 8, { width: colWidths[0] });
          cellX += colWidths[0];

          // Delivery ID (truncated)
          const shortId = delivery.id ? delivery.id.substring(0, 18) : "N/A";
          doc.font("Courier").fontSize(8);
          doc.text(shortId, cellX, yPos + 9, { width: colWidths[1] });
          cellX += colWidths[1];

          // Truck Plate
          doc.font("Helvetica").fontSize(9);
          doc.text(delivery.truckPlate || "N/A", cellX, yPos + 8, { width: colWidths[2] });
          cellX += colWidths[2];

          // Date
          doc.text(this.formatDate(delivery.deliveryDate), cellX, yPos + 8, { width: colWidths[3] });
          cellX += colWidths[3];

          // Amount (right-aligned)
          doc.font("Helvetica-Bold").fillColor("#111827");
          doc.text(this.formatCurrency(delivery.amount), cellX - 8, yPos + 8, {
            width: colWidths[4],
            align: "right",
          });

          // Row divider line
          doc.moveTo(tableX, yPos + 28).lineTo(tableX + pageWidth, yPos + 28).lineWidth(0.5).strokeColor("#e5e7eb").stroke();

          yPos += 28;
        });

        // ═══════════════════════════════════════
        // TOTAL ROW
        // ═══════════════════════════════════════
        yPos += 5;
        doc.rect(tableX, yPos, pageWidth, 35).fill("#ecfdf5");

        doc.fontSize(12).font("Helvetica-Bold").fillColor("#059669");
        doc.text("Total Amount Paid:", tableX + 8, yPos + 10, {
          width: pageWidth - colWidths[4] - 24,
          align: "right",
        });
        doc.text(this.formatCurrency(data.totalAmount), tableX + pageWidth - colWidths[4] - 8, yPos + 10, {
          width: colWidths[4],
          align: "right",
        });

        yPos += 55;

        // ═══════════════════════════════════════
        // FOOTER
        // ═══════════════════════════════════════
        // Separator line
        doc.moveTo(50, yPos).lineTo(50 + pageWidth, yPos).lineWidth(1).strokeColor("#e5e7eb").stroke();
        yPos += 15;

        doc.fontSize(9).font("Helvetica").fillColor("#6b7280");
        doc.text(
          "This is an official payment receipt from E-Trucking Management System.",
          50,
          yPos,
          { width: pageWidth, align: "center" },
        );
        doc.text(
          "This document confirms that payment has been received and verified.",
          50,
          yPos + 14,
          { width: pageWidth, align: "center" },
        );
        doc.text(
          "For inquiries, please contact our support team.",
          50,
          yPos + 28,
          { width: pageWidth, align: "center" },
        );

        // Finalize PDF
        doc.end();

        writeStream.on("finish", () => {
          console.log(`✅ PDF written to: ${filePath}`);
          resolve();
        });

        writeStream.on("error", (err) => {
          console.error("❌ Error writing PDF:", err);
          reject(err);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get receipt file path for serving
   */
  getReceiptFilePath(relativePath) {
    const fullPath = path.join(this.basePath, relativePath);

    if (!fs.existsSync(fullPath)) {
      throw new Error("Receipt file not found");
    }

    return fullPath;
  }

  /**
   * Get receipt by proof ID
   */
  async getReceiptByProofId(proofId) {
    try {
      const snapshot = await db
        .collection("paymentReceipts")
        .where("proofId", "==", proofId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error("Error getting receipt by proof ID:", error);
      throw error;
    }
  }
}

module.exports = new ReceiptService();
