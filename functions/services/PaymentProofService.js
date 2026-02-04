const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

// Get Firestore database instance
const db = admin.firestore();

/**
 * PaymentProofService
 * Handles payment proof upload, storage, and verification workflows
 *
 * Flow:
 * 1. Client uploads proof (PNG/PDF, max 5MB) for one or multiple deliveries
 * 2. Creates a PaymentProof document linking to all selected deliveries
 * 3. Updates all linked deliveries to 'pending_verification' status
 * 4. Admin reviews proof and either approves (sets all to 'paid') or rejects
 * 5. On rejection, client can resubmit new proof
 */
class PaymentProofService {
  constructor() {
    this.basePath = path.join(process.cwd(), "uploads", "payment-proofs");
    this.ensureBaseDirectory();

    // Allowed file types
    this.allowedMimeTypes = ["image/png", "application/pdf"];

    // Max file size: 5MB
    this.maxFileSize = 5 * 1024 * 1024;
  }

  /**
   * Ensure base directory exists
   */
  ensureBaseDirectory() {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
      console.log("✅ Created payment proofs directory:", this.basePath);
    }
  }

  /**
   * Get upload path for a specific year/month
   */
  getUploadPath(year, month) {
    const uploadPath = path.join(
      this.basePath,
      String(year),
      String(month).padStart(2, "0"),
    );

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    return uploadPath;
  }

  /**
   * Validate file before upload
   */
  validateFile(file) {
    if (!file) {
      return { valid: false, error: "No file provided" };
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      return { valid: false, error: "File size must be less than 5MB" };
    }

    // Check mime type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      return { valid: false, error: "Only PNG and PDF files are allowed" };
    }

    return { valid: true };
  }

  /**
   * Upload payment proof for one or multiple deliveries
   * @param {Object} file - The uploaded file object (from multer)
   * @param {string[]} deliveryIds - Array of delivery IDs this proof covers
   * @param {string} clientId - The client uploading the proof
   * @param {string} clientName - Client's name for display
   * @param {string} referenceNumber - Bank/e-wallet reference number
   * @param {string} notes - Optional notes from client
   */
  async uploadProof(
    file,
    deliveryIds,
    clientId,
    clientName,
    referenceNumber,
    notes = "",
  ) {
    try {
      console.log("📤 Uploading payment proof for deliveries:", deliveryIds);

      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Validate delivery IDs
      if (!deliveryIds || deliveryIds.length === 0) {
        throw new Error("At least one delivery ID is required");
      }

      // Verify all deliveries exist and belong to the client
      const deliveries = [];
      let totalAmount = 0;

      for (const deliveryId of deliveryIds) {
        const deliveryRef = db.collection("deliveries").doc(deliveryId);
        const deliveryDoc = await deliveryRef.get();

        if (!deliveryDoc.exists) {
          throw new Error(`Delivery ${deliveryId} not found`);
        }

        const delivery = deliveryDoc.data();

        // Verify delivery belongs to this client
        if (delivery.clientId !== clientId) {
          throw new Error(
            `Delivery ${deliveryId} does not belong to this client`,
          );
        }

        // Check if delivery is already pending_verification or paid
        if (delivery.paymentStatus === "pending_verification") {
          throw new Error(
            `Delivery ${deliveryId} already has a pending proof awaiting verification`,
          );
        }
        if (delivery.paymentStatus === "paid") {
          throw new Error(`Delivery ${deliveryId} is already paid`);
        }

        deliveries.push({
          id: deliveryId,
          amount: parseFloat(
            delivery.deliveryRate || delivery.DeliveryRate || 0,
          ),
          truckPlate: delivery.truckPlate || delivery.TruckPlate,
          deliveryDate: delivery.deliveryDate,
        });

        totalAmount += parseFloat(
          delivery.deliveryRate || delivery.DeliveryRate || 0,
        );
      }

      // Generate unique filename
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const timestamp = now.getTime();
      const randomSuffix = Math.round(Math.random() * 1e9);
      const fileExt = path.extname(file.originalname).toLowerCase();
      const fileName = `proof_${clientId}_${timestamp}_${randomSuffix}${fileExt}`;

      // Get upload path
      const uploadPath = this.getUploadPath(year, month);
      const filePath = path.join(uploadPath, fileName);
      const relativePath = path.relative(this.basePath, filePath);

      // Save file
      await fs.promises.copyFile(file.path, filePath);
      // Clean up temp file
      if (fs.existsSync(file.path)) {
        await fs.promises.unlink(file.path);
      }

      console.log("✅ Proof file saved:", fileName);

      // Create PaymentProof document
      const proofData = {
        deliveryIds: deliveryIds,
        deliveries: deliveries,
        proofFilePath: relativePath,
        proofFileName: fileName,
        proofFileType: file.mimetype,
        proofFileSize: file.size,
        referenceNumber: referenceNumber || "",
        notes: notes || "",
        totalAmount: totalAmount,
        clientId: clientId,
        clientName: clientName,
        uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "pending", // pending, approved, rejected
        processedBy: null,
        processedAt: null,
        rejectionReason: null,
      };

      const proofRef = await db.collection("paymentProofs").add(proofData);
      const proofId = proofRef.id;

      console.log("✅ PaymentProof document created:", proofId);

      // Update all linked deliveries to pending_verification
      const batch = db.batch();
      for (const deliveryId of deliveryIds) {
        const deliveryRef = db.collection("deliveries").doc(deliveryId);
        batch.update(deliveryRef, {
          paymentStatus: "pending_verification",
          proofId: proofId,
          proofUploadedAt: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();

      console.log("✅ All deliveries updated to pending_verification");

      return {
        success: true,
        proofId: proofId,
        deliveryCount: deliveryIds.length,
        totalAmount: totalAmount,
        message: `Payment proof uploaded successfully for ${deliveryIds.length} delivery(s). Awaiting admin verification.`,
      };
    } catch (error) {
      console.error("❌ Error uploading payment proof:", error);
      throw error;
    }
  }

  /**
   * Get proof details for a specific payment/delivery
   */
  async getProofByDeliveryId(deliveryId) {
    try {
      const deliveryRef = db.collection("deliveries").doc(deliveryId);
      const deliveryDoc = await deliveryRef.get();

      if (!deliveryDoc.exists) {
        throw new Error("Delivery not found");
      }

      const delivery = deliveryDoc.data();

      if (!delivery.proofId) {
        throw new Error("No proof uploaded for this delivery");
      }

      const proofRef = db.collection("paymentProofs").doc(delivery.proofId);
      const proofDoc = await proofRef.get();

      if (!proofDoc.exists) {
        throw new Error("Proof document not found");
      }

      const proof = proofDoc.data();

      return {
        id: proofDoc.id,
        ...proof,
        uploadedAt: proof.uploadedAt?.toDate?.() || proof.uploadedAt,
        processedAt: proof.processedAt?.toDate?.() || proof.processedAt,
      };
    } catch (error) {
      console.error("❌ Error getting proof:", error);
      throw error;
    }
  }

  /**
   * Get all pending verification proofs (Admin only)
   */
  async getPendingProofs() {
    try {
      const proofsSnapshot = await db
        .collection("paymentProofs")
        .where("status", "==", "pending")
        .orderBy("uploadedAt", "desc")
        .get();

      const proofs = [];
      proofsSnapshot.forEach((doc) => {
        const proof = doc.data();
        proofs.push({
          id: doc.id,
          ...proof,
          uploadedAt: proof.uploadedAt?.toDate?.() || proof.uploadedAt,
        });
      });

      return proofs;
    } catch (error) {
      console.error("❌ Error getting pending proofs:", error);
      throw error;
    }
  }

  /**
   * Approve payment proof (Admin only)
   * Marks all linked deliveries as paid
   */
  async approveProof(proofId, adminId, adminUsername) {
    try {
      console.log("✅ Approving proof:", proofId);

      const proofRef = db.collection("paymentProofs").doc(proofId);
      const proofDoc = await proofRef.get();

      if (!proofDoc.exists) {
        throw new Error("Proof not found");
      }

      const proof = proofDoc.data();

      if (proof.status !== "pending") {
        throw new Error(`Proof has already been ${proof.status}`);
      }

      const now = admin.firestore.FieldValue.serverTimestamp();
      const nowDate = new Date();

      // Update proof status
      await proofRef.update({
        status: "approved",
        processedBy: adminId,
        processedByName: adminUsername,
        processedAt: now,
      });

      // Update all linked deliveries to paid
      const batch = db.batch();
      for (const deliveryId of proof.deliveryIds) {
        const deliveryRef = db.collection("deliveries").doc(deliveryId);
        batch.update(deliveryRef, {
          paymentStatus: "paid",
          paidAt: now,
          paidViaProof: true,
          proofApprovedBy: adminId,
          proofApprovedAt: now,
          updated_at: now,
        });
      }
      await batch.commit();

      console.log(
        `✅ Proof approved. ${proof.deliveryIds.length} deliveries marked as paid.`,
      );

      return {
        success: true,
        proofId: proofId,
        deliveriesUpdated: proof.deliveryIds.length,
        totalAmount: proof.totalAmount,
        message: `Payment approved. ${proof.deliveryIds.length} delivery(s) marked as paid.`,
      };
    } catch (error) {
      console.error("❌ Error approving proof:", error);
      throw error;
    }
  }

  /**
   * Reject payment proof (Admin only)
   * Resets deliveries to allow client to resubmit
   */
  async rejectProof(proofId, adminId, adminUsername, rejectionReason) {
    try {
      console.log("❌ Rejecting proof:", proofId);

      if (!rejectionReason || rejectionReason.trim() === "") {
        throw new Error("Rejection reason is required");
      }

      const proofRef = db.collection("paymentProofs").doc(proofId);
      const proofDoc = await proofRef.get();

      if (!proofDoc.exists) {
        throw new Error("Proof not found");
      }

      const proof = proofDoc.data();

      if (proof.status !== "pending") {
        throw new Error(`Proof has already been ${proof.status}`);
      }

      const now = admin.firestore.FieldValue.serverTimestamp();

      // Update proof status
      await proofRef.update({
        status: "rejected",
        processedBy: adminId,
        processedByName: adminUsername,
        processedAt: now,
        rejectionReason: rejectionReason.trim(),
      });

      // Reset deliveries to pending (allows client to resubmit)
      const batch = db.batch();
      for (const deliveryId of proof.deliveryIds) {
        const deliveryRef = db.collection("deliveries").doc(deliveryId);
        batch.update(deliveryRef, {
          paymentStatus: "pending",
          proofId: null,
          proofUploadedAt: null,
          proofRejectedAt: now,
          proofRejectionReason: rejectionReason.trim(),
          updated_at: now,
        });
      }
      await batch.commit();

      console.log(
        `❌ Proof rejected. ${proof.deliveryIds.length} deliveries reset to pending.`,
      );

      return {
        success: true,
        proofId: proofId,
        deliveriesUpdated: proof.deliveryIds.length,
        message: `Payment proof rejected. Client can now submit a new proof.`,
      };
    } catch (error) {
      console.error("❌ Error rejecting proof:", error);
      throw error;
    }
  }

  /**
   * Get proof file path for serving
   */
  getProofFilePath(relativePath) {
    const fullPath = path.join(this.basePath, relativePath);

    if (!fs.existsSync(fullPath)) {
      throw new Error("Proof file not found");
    }

    return fullPath;
  }

  /**
   * Get content type for serving file
   */
  getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      ".pdf": "application/pdf",
      ".png": "image/png",
    };

    return contentTypes[ext] || "application/octet-stream";
  }
}

module.exports = new PaymentProofService();
