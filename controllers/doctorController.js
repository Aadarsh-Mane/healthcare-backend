import hospitalDoctors from "../models/hospitalDoctorSchema.js";
import LabReport from "../models/labreportSchema.js";
import PatientHistory from "../models/patientHistorySchema.js";
import patientSchema from "../models/patientSchema.js";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { dirname } from "path";
import puppeteer from "puppeteer";
import path from "path";
// import fs from "fs";
import fs from "fs/promises";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const getPatients = async (req, res) => {
  console.log(req.usertype);
  try {
    // Ensure only a doctor can access this route by checking the user type
    if (req.usertype !== "doctor") {
      return res
        .status(403)
        .json({ message: "Access denied. Only doctors can view patients." });
    }

    const patients = await patientSchema.find();
    res.status(200).json(patients);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching patients", error: error.message });
  }
};
// Route to admit a patient to the authenticated doctor
export const admitPatient = async (req, res) => {
  const { patientId } = req.params;

  try {
    // Ensure the user is a doctor
    if (req.usertype !== "doctor") {
      return res
        .status(403)
        .json({ message: "Access denied. Only doctors can admit patients." });
    }

    // Retrieve the patient by ID
    const patient = await patientSchema.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const doctor = await hospitalDoctors.findById(req.userId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Check if the patient has any active admissions
    const hasActiveAdmission =
      patient.admissionRecords.length > 0 &&
      patient.admissionRecords[patient.admissionRecords.length - 1]
        .dischargeDate === undefined;

    if (hasActiveAdmission) {
      return res.status(400).json({
        message: `Patient ${patient.name} is already admitted. No new admission can be created until discharge.`,
      });
    }

    // Add a new admission record with the doctor’s name
    patient.admissionRecords.push({
      admissionDate: new Date(),
      doctorName: doctor.doctorName,
      dischargeDate: null, // Initialize dischargeDate as null
    });

    await patient.save();

    res.status(200).json({
      message: `Patient ${patient.name} admitted to doctor ${doctor.doctorName}`,
      patientDetails: patient,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error admitting patient", error: error.message });
  }
};

export const getAssignedPatients = async (req, res) => {
  try {
    const doctorId = req.userId; // Get doctor ID from authenticated user

    // Find all patients with admission records assigned to this doctor
    const patients = await patientSchema.find({
      "admissionRecords.doctor.id": doctorId,
    });

    // Filter admission records specifically assigned to this doctor
    const filteredPatients = patients.map((patient) => {
      const relevantAdmissions = patient.admissionRecords.filter(
        (record) => record.doctor && record.doctor.id.toString() === doctorId
      );
      return { ...patient.toObject(), admissionRecords: relevantAdmissions };
    });

    res.status(200).json({
      message: "Patients assigned to doctor retrieved successfully",
      patients: filteredPatients,
    });
  } catch (error) {
    console.error("Error retrieving assigned patients:", error);
    res
      .status(500)
      .json({ message: "Error retrieving patients", error: error.message });
  }
};
export const getPatientDetailsForDoctor = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Ensure the user is a doctor
    if (req.usertype !== "doctor") {
      return res.status(403).json({ message: "Access denied" });
    }

    // Find the patient with admission records assigned to the doctor
    const patient = await patientSchema
      .findOne({
        patientId,
        "admissionRecords.doctor": req.userId, // Match admissions where this doctor is assigned
      })
      .populate("admissionRecords.doctor", "doctorName") // Populate doctor details
      .populate("admissionRecords.reports", "reportDetails") // Populate reports
      .populate("admissionRecords.followUps.nurseId", "nurseName"); // Populate follow-up nurse details

    if (!patient) {
      return res
        .status(404)
        .json({ message: "Patient not found or not assigned to this doctor" });
    }

    res.status(200).json({ patient });
  } catch (error) {
    console.error("Error fetching patient details:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getDoctorProfile = async (req, res) => {
  const doctorId = req.userId; // Get doctorId from the request

  try {
    // Find the doctor by ID
    const doctorProfile = await hospitalDoctors
      .findById(doctorId)
      .select("-password"); // Exclude password for security

    // Check if doctor profile exists
    if (!doctorProfile) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Return doctor profile
    return res.status(200).json({ doctorProfile });
  } catch (error) {
    console.error("Error fetching doctor profile:", error);
    return res
      .status(500)
      .json({ message: "Error fetching doctor profile", error: error.message });
  }
};
export const assignPatientToLab = async (req, res) => {
  const doctorId = req.userId;
  try {
    const { admissionId, patientId, labTestNameGivenByDoctor } = req.body;

    // Validate request fields
    if (!admissionId || !patientId || !doctorId) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if the patient exists
    const patient = await patientSchema.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Check if the admission record exists
    const admissionRecord = patient.admissionRecords.id(admissionId);
    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Optionally: Check for duplicate lab test assignment
    const existingLabReport = await LabReport.findOne({
      admissionId,
      labTestNameGivenByDoctor,
    });
    if (existingLabReport) {
      return res
        .status(400)
        .json({ message: "Lab test already assigned for this admission" });
    }

    // Create a new lab report assignment
    const labReport = new LabReport({
      admissionId,
      patientId,
      doctorId,
      labTestNameGivenByDoctor,
    });

    await labReport.save();

    res.status(200).json({
      message: "Patient assigned to lab successfully",
      labReport,
    });
  } catch (error) {
    console.error("Error assigning patient to lab:", error);
    res.status(500).json({
      message: "Error assigning patient to lab",
      error: error.message,
    });
  }
};
export const admitPatientByDoctor = async (req, res) => {
  try {
    const { admissionId } = req.body; // Get admission ID from request parameters
    const doctorId = req.userId; // Get doctor ID from authenticated user
    console.log("doctor", doctorId);
    // Validate admission ID
    if (!admissionId) {
      return res.status(400).json({ message: "Admission ID is required" });
    }
    // Find the patient and relevant admission record
    const patient = await patientSchema.findOne({
      "admissionRecords._id": admissionId,
    });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission record
    const admissionRecord = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );
    console.log(admissionRecord.doctor.id.toString());
    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found" });
    }
    if (admissionRecord.doctor.id.toString() !== doctorId) {
      return res.status(403).json({
        message: "You are not authorized to admit this patient",
      });
    }
    if (admissionRecord.status === "admitted") {
      return res.status(400).json({
        message: "This patient has already been admitted for this admission ID",
      });
    }

    // Update the admission record with the doctor details
    // admissionRecord.doctor = { id: doctorId }; // Update doctor ID
    admissionRecord.status = "admitted"; // Optional: Update the status

    // Save the updated patient document
    await patient.save();

    res.status(200).json({
      message: "Patient successfully admitted",
      patient: {
        id: patient._id,
        name: patient.name,
        admissionRecord,
      },
    });
  } catch (error) {
    console.error("Error admitting patient:", error);
    res.status(500).json({
      message: "Error admitting patient",
      error: error.message,
    });
  }
};
export const getAdmittedPatientsByDoctor = async (req, res) => {
  try {
    const doctorId = req.userId; // Get doctor ID from authenticated user

    // Find all patients with admission records associated with this doctor
    const patients = await patientSchema.find({
      "admissionRecords.doctor.id": doctorId,
      "admissionRecords.status": "admitted", // Only admitted patients
    });

    if (patients.length === 0) {
      return res.status(404).json({
        message: "No admitted patients found for this doctor",
      });
    }

    // Filter admission records specifically for this doctor
    const filteredPatients = patients.map((patient) => {
      const relevantAdmissions = patient.admissionRecords.filter(
        (record) =>
          record.doctor &&
          record.doctor.id.toString() === doctorId &&
          record.status === "admitted"
      );
      return { ...patient.toObject(), admissionRecords: relevantAdmissions };
    });

    res.status(200).json({
      message: "Admitted patients retrieved successfully",
      patients: filteredPatients,
    });
  } catch (error) {
    console.error("Error retrieving admitted patients:", error);
    res.status(500).json({
      message: "Error retrieving admitted patients",
      error: error.message,
    });
  }
};

export const getPatientsAssignedByDoctor = async (req, res) => {
  const doctorId = req.userId; // Get the doctorId from the request's user (assuming you're using authentication)

  try {
    // Fetch lab reports where the doctorId matches the logged-in doctor
    const labReports = await LabReport.find({ doctorId })
      .populate({
        path: "patientId",
        select: "name age gender contact", // Select specific fields from the Patient schema
      })
      .populate({
        path: "doctorId",
        select: "doctorName email", // Select specific fields from the Doctor schema
      });

    if (!labReports || labReports.length === 0) {
      return res
        .status(404)
        .json({ message: "No patients assigned by this doctor." });
    }

    res.status(200).json({
      message: "Patients assigned by the doctor retrieved successfully",
      labReports,
    });
  } catch (error) {
    console.error("Error retrieving patients assigned by doctor:", error);
    res
      .status(500)
      .json({ message: "Error retrieving patients", error: error.message });
  }
};

export const dischargePatient = async (req, res) => {
  const doctorId = req.userId;
  const { patientId, admissionId } = req.body;
  console.log("here is the deital", req.body);
  if (!patientId || !admissionId || !doctorId) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    // Fetch the patient document
    const patient = await patientSchema
      .findOne({ patientId })
      .populate("admissionRecords");
    console.log(patient);
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }
    console.log("Admission records:", patient.admissionRecords);

    const admissionIndex = patient.admissionRecords.findIndex(
      (admission) =>
        admission._id.toString() === admissionId &&
        admission.doctor.id.toString() === doctorId
    );

    if (admissionIndex === -1) {
      console.log("Admission not found for:", {
        patientId,
        admissionId,
        doctorId,
      });
      return res
        .status(403)
        .json({ error: "Unauthorized or admission not found" });
    }
    // Extract the admission record
    const [admissionRecord] = patient.admissionRecords.splice(
      admissionIndex,
      1
    );

    // Mark patient as discharged
    patient.discharged = true;

    // Save the updated patient document
    await patient.save();

    // Fetch lab reports for this admission
    const labReports = await LabReport.find({ admissionId }).exec();

    // Add to PatientHistory
    let patientHistory = await PatientHistory.findOne({ patientId });

    if (!patientHistory) {
      // Create a new history document if it doesn't exist
      patientHistory = new PatientHistory({
        patientId: patient.patientId,
        name: patient.name,
        gender: patient.gender,
        contact: patient.contact,
        age: patient.age,
        history: [],
      });
    }
    // Loop through each follow-up and ensure all details are included
    const followUps = admissionRecord.followUps.map((followUp) => ({
      ...followUp.toObject(), // Spread the follow-up data
      // Include additional or computed values if necessary (e.g., final observations)
    }));
    console.log("doctorConsulting:", admissionRecord.doctorConsulting);

    // Append the admission record to the history, including lab reports
    patientHistory.history.push({
      admissionId,
      admissionDate: admissionRecord.admissionDate,

      previousRemainingAmount: patient.pendingAmount,
      amountToBePayed: admissionRecord.amountToBePayed,
      conditionAtDischarge: admissionRecord.conditionAtDischarge,
      weight: admissionRecord.weight,
      dischargeDate: new Date(),
      reasonForAdmission: admissionRecord.reasonForAdmission,
      symptoms: admissionRecord.symptoms,
      initialDiagnosis: admissionRecord.initialDiagnosis,
      doctor: admissionRecord.doctor,
      reports: admissionRecord.reports,
      followUps: followUps,
      labReports: labReports.map((report) => ({
        labTestNameGivenByDoctor: report.labTestNameGivenByDoctor,
        reports: report.reports,
      })), // Add relevant lab report details
      doctorPrescriptions: admissionRecord.doctorPrescriptions,
      doctorConsulting: admissionRecord.doctorConsulting,
      symptomsByDoctor: admissionRecord.symptomsByDoctor,
      vitals: admissionRecord.vitals,
      diagnosisByDoctor: admissionRecord.diagnosisByDoctor,
    });

    // Save the history document
    await patientHistory.save();

    // Notify the doctor about the discharge
    notifyDoctor(doctorId, patientId, admissionRecord);

    res.status(200).json({
      message: "Patient discharged successfully",
      updatedPatient: patient,
      updatedHistory: patientHistory,
    });
  } catch (error) {
    console.error("Error discharging patient:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const getAllDoctorsProfiles = async (req, res) => {
  try {
    // Find all doctors' profiles
    const doctorsProfiles = await hospitalDoctors.find().select("-password"); // Exclude passwords for security

    // Check if doctors' profiles exist
    if (!doctorsProfiles || doctorsProfiles.length === 0) {
      return res.status(404).json({ message: "No doctors found" });
    }

    // Return doctors' profiles
    return res.status(200).json({ doctorsProfiles });
  } catch (error) {
    console.error("Error fetching doctors' profiles:", error);
    return res.status(500).json({
      message: "Error fetching doctors' profiles",
      error: error.message,
    });
  }
};

// Mock notification function
const notifyDoctor = (doctorId, patientId, admissionRecord) => {
  console.log(
    `Doctor ${doctorId} notified: Patient ${patientId} discharged from admission on ${admissionRecord.admissionDate}`
  );
};
export const getDischargedPatientsByDoctor = async (req, res) => {
  // const doctorId = req.userId;

  try {
    // Fetch patient history for the doctor, filtering by discharge date
    const patientsHistory = await PatientHistory.aggregate([
      {
        $unwind: "$history", // Unwind the history array to get each admission record separately
      },
      {
        $match: {
          // "history.doctor.id": new mongoose.Types.ObjectId(doctorId), // Match by doctor ID
          "history.dischargeDate": { $ne: null }, // Only include records with a discharge date
        },
      },
      {
        $project: {
          patientId: 1,
          name: 1,
          gender: 1,
          contact: 1,
          admissionId: "$history.admissionId",
          admissionDate: "$history.admissionDate",
          dischargeDate: "$history.dischargeDate",
          reasonForAdmission: "$history.reasonForAdmission",
          symptoms: "$history.symptoms",
          initialDiagnosis: "$history.initialDiagnosis",
          doctor: "$history.doctor",
          reports: "$history.reports",
          followUps: "$history.followUps",
          labReports: "$history.labReports",
        },
      },
    ]);

    if (!patientsHistory.length) {
      return res.status(404).json({ error: "No discharged patients found" });
    }

    res.status(200).json({
      message: "Discharged patients retrieved successfully",
      patientsHistory,
    });
  } catch (error) {
    console.error("Error fetching discharged patients:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Function to generate PDF from HTML
export const getPatientHistory = async (req, res) => {
  // Create __dirname in ES modules
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const { patientId } = req.params;

  try {
    // Fetch patient history
    const patientHistory = await PatientHistory.findOne({ patientId })
      .populate({
        path: "history.doctor.id",
        select: "name",
      })
      .populate({
        path: "history.labReports.reports",
        select: "labTestName reportUrl labType",
      });

    if (!patientHistory) {
      return res.status(404).json({ message: "Patient history not found" });
    }
    return res.status(200).json(patientHistory);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const addConsultant = async (req, res) => {
  const { patientId, admissionId, prescription } = req.body;

  try {
    // Validate request body
    if (!patientId || !admissionId || !prescription) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Find the patient by patientId
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    // Find the admission record by its implicit `_id` (admissionId)
    const admissionRecord = patient.admissionRecords.id(admissionId);
    if (!admissionRecord) {
      return res.status(404).json({ error: "Admission record not found" });
    }

    // Add the new prescription to the `doctorConsultant` field
    admissionRecord.doctorConsultant.push(prescription);

    // Save the updated patient document
    await patient.save();

    return res
      .status(200)
      .json({ message: "Prescription added successfully", patient });
  } catch (error) {
    console.error("Error adding prescription:", error);
    return res.status(500).json({ error: "Server error" });
  }
};
export const fetchConsultant = async (req, res) => {
  const { admissionId } = req.params;

  if (!admissionId) {
    return res.status(400).json({ error: "Admission ID is required" });
  }

  try {
    const patient = await patientSchema.findOne({
      "admissionRecords._id": admissionId,
    });

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    // Find the admission record with the specified ID
    const admissionRecord = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );

    if (!admissionRecord || !admissionRecord.doctorConsultant) {
      return res
        .status(404)
        .json({ error: "No prescriptions found for this admission" });
    }

    // Return the prescriptions associated with the admission
    res.status(200).json(admissionRecord.doctorConsultant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch prescriptions" });
  }
};

// Suggestion endpoint

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let data;

// Load data asynchronously
const loadData = async () => {
  try {
    const filePath = path.resolve(__dirname, "test.json");
    const fileContent = await fs.readFile(filePath, "utf8");
    data = JSON.parse(fileContent);
    console.log(data);
  } catch (error) {
    console.error("Error reading or parsing test.json:", error);
    data = null;
  }
};

// Load data when the module is loaded
// loadData();

export const suggestions = (req, res) => {
  try {
    const query = req.query.query.toLowerCase();

    // Ensure data is defined and is an object
    if (!data || typeof data !== "object") {
      return res.status(500).json({ message: "Data source is not available" });
    }

    // Filter and return only the medicine names that match the query
    const suggestions = Object.values(data).filter(
      (item) => typeof item === "string" && item.toLowerCase().includes(query)
    );

    console.log(suggestions); // Log to verify the suggestions

    res.json(suggestions); // Send suggestions as the response
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const addPrescription = async (req, res) => {
  try {
    const { patientId, admissionId, prescription } = req.body;

    // Find the patient by ID
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission record
    const admission = patient.admissionRecords.id(admissionId);
    if (!admission) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Add the prescription
    admission.doctorPrescriptions.push(prescription);

    // Save the updated patient document
    await patient.save();

    res
      .status(201)
      .json({ message: "Prescription added successfully", prescription });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to add prescription", error: error.message });
  }
};
export const fetchPrescription = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;

    // Find the patient by ID
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission record
    const admission = patient.admissionRecords.id(admissionId);
    if (!admission) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Return the prescriptions
    res.status(200).json({ prescriptions: admission.doctorPrescriptions });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch prescriptions", error: error.message });
  }
};

export const addSymptomsByDoctor = async (req, res) => {
  try {
    const { patientId, admissionId, symptoms } = req.body;
    console.log;
    if (!patientId || !admissionId || !symptoms) {
      return res.status(400).json({
        message: "Patient ID, Admission ID, and symptoms are required.",
      });
    }

    const patient = await patientSchema.findOneAndUpdate(
      { patientId, "admissionRecords._id": admissionId }, // Matching patient and admission record
      { $push: { "admissionRecords.$.symptomsByDoctor": { $each: symptoms } } }, // Pushing symptoms to the specific admission
      { new: true }
    );

    if (!patient) {
      return res
        .status(404)
        .json({ message: "Patient or Admission not found." });
    }

    res.status(200).json({ message: "Symptoms added successfully.", patient });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};
// Controller to fetch symptoms by patientId and admissionId
export const fetchSymptoms = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;
    console.log("checking", patientId, admissionId);
    // Validate that both patientId and admissionId are provided
    if (!patientId || !admissionId) {
      return res
        .status(400)
        .json({ message: "Patient ID and Admission ID are required." });
    }

    // Find the patient and admission record
    const patient = await patientSchema.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Find the specific admission record
    const admissionRecord = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );

    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found." });
    }

    // Extract the symptomsByDoctor field
    const symptoms = admissionRecord.symptomsByDoctor;

    res.status(200).json({ symptoms });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

export const addVitals = async (req, res) => {
  try {
    const { patientId, admissionId, vitals } = req.body;

    if (!patientId || !admissionId || !vitals) {
      return res.status(400).json({
        message: "Patient ID, Admission ID, and vitals are required.",
      });
    }

    const patient = await patientSchema.findOneAndUpdate(
      { patientId, "admissionRecords._id": admissionId }, // Matching patient and admission record
      { $push: { "admissionRecords.$.vitals": vitals } }, // Pushing vitals to the specific admission
      { new: true }
    );

    if (!patient) {
      return res
        .status(404)
        .json({ message: "Patient or Admission not found." });
    }

    res.status(200).json({ message: "Vitals added successfully.", patient });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};
// Controller to fetch vitals by patientId and admissionId
export const fetchVitals = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;

    // Validate that both patientId and admissionId are provided
    if (!patientId || !admissionId) {
      return res
        .status(400)
        .json({ message: "Patient ID and Admission ID are required." });
    }

    // Fetch the patient and admission records
    const patient = await patientSchema.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Find the specific admission record
    const admissionRecord = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );

    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found." });
    }

    // Extract the vitals
    const { vitals } = admissionRecord;

    res.status(200).json({ vitals });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

export const addDiagnosisByDoctor = async (req, res) => {
  try {
    const { patientId, admissionId, diagnosis } = req.body;

    if (!patientId || !admissionId || !diagnosis) {
      return res.status(400).json({
        message: "Patient ID, Admission ID, and diagnosis are required.",
      });
    }

    const patient = await patientSchema.findOneAndUpdate(
      { patientId, "admissionRecords._id": admissionId }, // Matching patient and admission record
      {
        $push: { "admissionRecords.$.diagnosisByDoctor": { $each: diagnosis } },
      }, // Pushing diagnosis to the specific admission
      { new: true }
    );

    if (!patient) {
      return res
        .status(404)
        .json({ message: "Patient or Admission not found." });
    }

    res.status(200).json({ message: "Diagnosis added successfully.", patient });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// Controller to fetch diagnosis by patientId and admissionId
export const fetchDiagnosis = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params;

    // Validate that both patientId and admissionId are provided
    if (!patientId || !admissionId) {
      return res
        .status(400)
        .json({ message: "Patient ID and Admission ID are required." });
    }

    // Find the patient document
    const patient = await patientSchema.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Locate the specific admission record
    const admissionRecord = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );

    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found." });
    }

    // Extract diagnosisByDoctor
    const diagnosis = admissionRecord.diagnosisByDoctor || [];

    res.status(200).json({ diagnosis });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};
export const updateConditionAtDischarge = async (req, res) => {
  const { admissionId, conditionAtDischarge, amountToBePayed } = req.body;
  console.log(req.body);
  const doctorId = req.userId;

  if (!admissionId || !conditionAtDischarge) {
    return res
      .status(400)
      .json({ message: "Admission ID and condition are required." });
  }

  if (
    amountToBePayed == null ||
    isNaN(amountToBePayed) ||
    amountToBePayed < 0
  ) {
    return res
      .status(400)
      .json({ message: "Valid amountToBePayed is required." });
  }

  const validConditions = [
    "Discharged",
    "Transferred",
    "A.M.A.",
    "Absconded",
    "Expired",
  ];
  if (!validConditions.includes(conditionAtDischarge)) {
    return res
      .status(400)
      .json({ message: "Invalid conditionAtDischarge value." });
  }

  try {
    // Find and update the specific admission record in a single operation
    const patient = await patientSchema.findOneAndUpdate(
      {
        admissionRecords: {
          $elemMatch: {
            _id: admissionId,
            "doctor.id": doctorId,
          },
        },
      },
      {
        $set: {
          "admissionRecords.$.conditionAtDischarge": conditionAtDischarge,
          "admissionRecords.$.amountToBePayed": amountToBePayed,
        },
      },
      { new: true }
    );

    if (!patient) {
      return res.status(404).json({
        message:
          "Admission record not found or you are not authorized to update this record.",
      });
    }

    res.status(200).json({
      message:
        "Condition at discharge and payment amount updated successfully.",
    });
  } catch (error) {
    console.error("Error updating condition at discharge:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const addDoctorConsultant = async (req, res) => {
  try {
    const { patientId, admissionId, consulting } = req.body;
    console.log("Request Body:", req.body.consulting); // Check the structure of the incoming data

    // Find the patient by ID
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission record
    const admission = patient.admissionRecords.id(admissionId);
    if (!admission) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Add the consulting data to the doctorConsulting array
    admission.doctorConsulting.push(consulting);

    console.log("Updated doctorConsulting:", admission.doctorConsulting); // Log to check if data is added correctly

    // Save the updated patient document
    await patient.save();

    res
      .status(201)
      .json({ message: "Consulting added successfully", consulting });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to add consulting", error: error.message });
  }
};
export const getDoctorConsulting = async (req, res) => {
  try {
    const { patientId, admissionId } = req.params; // Get parameters from the URL

    // Find the patient by ID
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission record
    const admission = patient.admissionRecords.id(admissionId);
    if (!admission) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Return the doctorConsulting array
    res.status(200).json({
      message: "Doctor consulting fetched successfully",
      doctorConsulting: admission.doctorConsulting,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch doctor consulting",
      error: error.message,
    });
  }
};
export const amountToBePayed = async (req, res) => {
  try {
    const { patientId, admissionId, amount } = req.body;

    // Validate input
    if (
      !patientId ||
      !admissionId ||
      typeof amount !== "number" ||
      amount < 0
    ) {
      return res.status(400).json({ message: "Invalid input provided." });
    }

    // Find the patient by ID
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Find the specific admission record
    const admissionRecord = patient.admissionRecords.id(admissionId);
    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found." });
    }

    // Update the amount to be paid
    admissionRecord.amountToBePayed = amount;

    // Save the changes to the database
    await patient.save();

    res.status(200).json({
      message: "Amount updated successfully.",
      admissionRecord,
    });
  } catch (error) {
    console.error("Error updating amount to be paid:", error);
    res.status(500).json({ message: "Server error.", error });
  }
};
export const getPatientHistory1 = async (req, res) => {
  const { patientId } = req.params;

  // Validate if the patientId is provided
  if (!patientId) {
    return res.status(400).json({ error: "Patient ID is required" });
  }

  try {
    // Fetch the patient history using the provided patientId
    const patientHistory = await PatientHistory.findOne(
      { patientId },
      {
        "history.followUps": 0, // Exclude follow-ups from the result
      }
    );

    // Check if history exists for the patient
    if (!patientHistory) {
      return res
        .status(404)
        .json({ error: `No history found for patient ID: ${patientId}` });
    }

    // Return the patient history
    res.status(200).json({
      message: "Patient history fetched successfully",
      history: patientHistory,
    });
  } catch (error) {
    console.error("Error fetching patient history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Load API key from environment variables or directly set it here
const genAI = new GoogleGenerativeAI("AIzaSyD2b5871MdBgJErszACzmBhtpLZrQe-U2k");

export const askQuestion = async (req, res) => {
  const { question } = req.body;

  try {
    // Fetch all patients dynamically from the database
    const patients = await patientSchema.find().sort({ _id: -1 });

    if (!patients || patients.length === 0) {
      return res.send("No patient records available.");
    }

    // Identify the patient mentioned in the question
    const patient = patients.find((p) =>
      question.toLowerCase().includes(p.name.toLowerCase())
    );

    if (!patient) {
      return res.send("No matching patient found for your query.");
    }

    // Check if the question is asking for prescriptions
    if (
      question.toLowerCase().includes("prescription") ||
      question.toLowerCase().includes("medicine")
    ) {
      const admissionDetails = patient.admissionRecords.map((record, index) => {
        const prescriptions = record.doctorPrescriptions.map(
          (prescription, i) => {
            const med = prescription.medicine;
            return `\n    Prescription ${i + 1}:
    - Medicine: ${med.name}
    - Morning: ${med.morning}
    - Afternoon: ${med.afternoon}
    - Night: ${med.night}
    - Comment: ${med.comment}
    - Prescribed Date: ${new Date(med.date).toLocaleDateString()}`;
          }
        );

        return `\n  Admission ${index + 1}:
  - Admission Date: ${new Date(record.admissionDate).toLocaleDateString()}
  - Discharge Status: ${record.conditionAtDischarge}
  - Reason for Admission: ${record.reasonForAdmission}
  - Prescriptions: ${
    prescriptions.length > 0 ? prescriptions.join("") : "No prescriptions found"
  }`;
      });

      const prescriptionResponse = `Prescriptions for ${patient.name}:
${
  admissionDetails.length > 0
    ? admissionDetails.join("\n")
    : "No admission records found."
}`;

      return res.send(prescriptionResponse);
    }

    // Otherwise, provide basic details
    const basicDetails = `Patient Details:
- Name: ${patient.name}
- Patient ID: ${patient.patientId}
- Age: ${patient.age}
- Gender: ${patient.gender}
- Contact: ${patient.contact}
- Address: ${patient.address || "N/A"}
- DOB: ${patient.dob || "N/A"}
- Discharged: ${patient.discharged ? "Yes" : "No"}
- Pending Amount: ${patient.pendingAmount}`;

    return res.send(basicDetails);
  } catch (error) {
    console.error("Error processing question:", error.message);
    return res.status(500).send("Failed to process the question.");
  }
};
export const askQuestionAI = async (req, res) => {
  const { question } = req.body;

  try {
    // Initialize the model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Generate content based on the question prompt
    const result = await model.generateContent(question);

    // Respond with the full result or just the AI-generated text
    return res.json({ answer: result.response.text() });
  } catch (error) {
    console.error("Error communicating with Gemini AI:", error.message);

    // Respond with an error message
    return res.status(500).json({ error: error.message });
  }
};
