import { fileURLToPath } from "url"; // To handle __dirname in ESM
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import cloudinary from "../helpers/cloudinary.js";
import LabReport from "../models/labreportSchema.js";
import { Readable } from "stream";

// export const getPatientsAssignedToLab = async (req, res) => {
//   try {
//     // Fetch all lab reports and populate patient and doctor details
//     const labReports = await LabReport.find()
//       .populate({
//         path: "patientId",
//         select: "name age gender contact admissionRecords", // Only include the necessary fields
//         match: {
//           // Only include patients with non-empty admissionRecords array
//           admissionRecords: { $not: { $size: 0 } },
//         },
//       })
//       .populate({
//         path: "doctorId",
//         select: "doctorName email",
//       });

//     if (!labReports || labReports.length === 0) {
//       return res
//         .status(404)
//         .json({ message: "No patients assigned to the lab." });
//     }

//     // Exclude followUps from the populated patient data
//     labReports.forEach((report) => {
//       report.patientId.admissionRecords.forEach((record) => {
//         delete record.followUps; // Remove the followUps field from each admission record
//       });
//     });

//     res.status(200).json({
//       message: "Patients assigned to the lab retrieved successfully",
//       labReports,
//     });
//   } catch (error) {
//     console.error("Error retrieving patients assigned to the lab:", error);
//     res
//       .status(500)
//       .json({ message: "Error retrieving patients", error: error.message });
//   }
// };
export const getPatientsAssignedToLab = async (req, res) => {
  try {
    // Fetch all lab reports and populate necessary patient and doctor fields
    const labReports = await LabReport.find()
      .populate({
        path: "patientId",
        select: "name age gender contact discharged", // Added 'discharged' field
      })
      .populate({
        path: "doctorId",
        select: "doctorName email", // Only include necessary doctor fields
      });

    if (!labReports || labReports.length === 0) {
      return res
        .status(404)
        .json({ message: "No patients assigned to the lab." });
    }

    res.status(200).json({
      message: "Patients assigned to the lab retrieved successfully",
      labReports,
    });
  } catch (error) {
    console.error("Error retrieving patients assigned to the lab:", error);
    res
      .status(500)
      .json({ message: "Error retrieving patients", error: error.message });
  }
};

export const generateReportPdfForPatient = async (req, res) => {
  // Setup __dirname for ESM
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  try {
    const { admissionId, patientId, labTestName, labType, labReportId } =
      req.body;
    const file = req.file; // Get the uploaded PDF file

    if (!admissionId || !patientId || !labTestName || !labType || !file) {
      return res.status(400).json({ message: "All fields are required" });
    }

    console.log("Uploaded file details:", file);

    // Authenticate with Google Drive
    const auth = new google.auth.GoogleAuth({
      credentials: ServiceAccount,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    const drive = google.drive({ version: "v3", auth });

    // Convert buffer to a readable stream
    const bufferStream = new Readable();
    bufferStream.push(file.buffer);
    bufferStream.push(null);

    // Upload file to Google Drive
    const fileMetadata = {
      name: file.originalname, // Use the original file name
      parents: ["1Trbtp9gwGwNF_3KNjNcfL0DHeSUp0HyV"], // Replace with your shared folder ID
    };
    const media = {
      mimeType: file.mimetype,
      body: bufferStream, // Stream the buffer directly
    };

    const uploadResponse = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id, webViewLink",
    });

    const reportUrl = uploadResponse.data.webViewLink; // Link to the uploaded file

    // Save report to MongoDB
    const labReport = await LabReport.findById(labReportId);
    if (!labReport) {
      return res.status(404).json({ message: "Lab report not found" });
    }

    labReport.reports.push({
      labTestName,
      reportUrl,
      labType,
      uploadedAt: new Date(),
    });

    await labReport.save();

    res.status(200).json({
      message: "Lab report uploaded successfully",
      labReport,
    });
  } catch (error) {
    console.error("Error uploading lab report:", error);
    res.status(500).json({
      message: "Error uploading lab report",
      error: error.message,
    });
  }
};
