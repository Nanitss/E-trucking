/**
 * ReceiptService
 * Generates payment receipts for approved payment proofs
 * Uses HTML-to-text format that can be viewed/printed by clients
 */

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

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
          amount: d.amount || d.deliveryRate,
          truckPlate: d.truckPlate,
          pickupLocation: d.pickupLocation,
          deliveryAddress: d.deliveryAddress || d.dropoffLocation,
        })),
        approvedBy: adminInfo.username,
        approvedAt: now,
        referenceNumber: proofData.referenceNumber || "N/A",
      };

      // Generate HTML receipt
      const htmlContent = this.generateHTMLReceipt(receiptData);

      // Save receipt file
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const receiptDir = path.join(this.basePath, String(year), month);

      if (!fs.existsSync(receiptDir)) {
        fs.mkdirSync(receiptDir, { recursive: true });
      }

      const fileName = `receipt_${receiptNumber}.html`;
      const filePath = path.join(receiptDir, fileName);
      const relativePath = path.relative(this.basePath, filePath);

      fs.writeFileSync(filePath, htmlContent, "utf8");

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
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ Receipt generated: ${receiptNumber}`);

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
   * Generate HTML receipt content
   */
  generateHTMLReceipt(data) {
    const formatCurrency = (amount) =>
      `₱${Number(amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
    const formatDate = (date) => {
      if (!date) return "N/A";
      const d = date instanceof Date ? date : new Date(date);
      return d.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    const deliveryRows = data.deliveries
      .map(
        (d, i) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${i + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-family: monospace;">${d.id}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${d.truckPlate || "N/A"}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${formatDate(d.deliveryDate)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${formatCurrency(d.amount)}</td>
      </tr>
    `,
      )
      .join("");

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt - ${data.receiptNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f3f4f6; padding: 40px; }
    .receipt { max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 30px 40px; }
    .header h1 { font-size: 28px; margin-bottom: 5px; }
    .header p { opacity: 0.9; font-size: 14px; }
    .content { padding: 40px; }
    .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
    .meta-item { background: #f9fafb; padding: 15px 20px; border-radius: 10px; }
    .meta-label { font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 5px; }
    .meta-value { font-size: 16px; font-weight: 600; color: #111827; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f3f4f6; padding: 12px 10px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; }
    .total-row { background: #ecfdf5; }
    .total-row td { padding: 15px 10px; font-weight: 700; font-size: 18px; color: #059669; }
    .footer { background: #f9fafb; padding: 20px 40px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
    .status-badge { display: inline-block; background: #dcfce7; color: #16a34a; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    @media print {
      body { background: white; padding: 0; }
      .receipt { box-shadow: none; border-radius: 0; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>E-Trucking Management System</h1>
      <p>Payment Receipt</p>
    </div>
    
    <div class="content">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
        <div>
          <h2 style="font-size: 20px; color: #111827; margin-bottom: 5px;">Receipt #${data.receiptNumber}</h2>
          <p style="color: #6b7280; font-size: 14px;">Generated on ${formatDate(data.generatedAt)}</p>
        </div>
        <span class="status-badge">✓ PAID</span>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <div class="meta-label">Client Name</div>
          <div class="meta-value">${data.clientName}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Reference Number</div>
          <div class="meta-value">${data.referenceNumber}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Payment Approved By</div>
          <div class="meta-value">${data.approvedBy}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Approval Date</div>
          <div class="meta-value">${formatDate(data.approvedAt)}</div>
        </div>
      </div>

      <h3 style="font-size: 14px; text-transform: uppercase; color: #6b7280; margin-bottom: 15px;">Paid Deliveries (${data.deliveries.length})</h3>
      
      <table>
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th>Delivery ID</th>
            <th>Truck</th>
            <th>Date</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${deliveryRows}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="4" style="text-align: right;">Total Amount Paid:</td>
            <td style="text-align: right;">${formatCurrency(data.totalAmount)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="footer">
      <p>This is an official payment receipt from E-Trucking Management System.</p>
      <p style="margin-top: 5px;">For inquiries, please contact support.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
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
