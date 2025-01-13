import Nurse from "../models/nurseSchema.js";
import patientSchema from "../models/patientSchema.js";

export const addFollowUp = async (req, res) => {
  try {
    const {
      patientId,
      admissionId,
      notes,
      observations,
      temperature,
      pulse,
      respirationRate,
      bloodPressure,
      oxygenSaturation,
      bloodSugarLevel,
      otherVitals,
      ivFluid,
      nasogastric,
      rtFeedOral,
      totalIntake,
      cvp,
      urine,
      stool,
      rtAspirate,
      otherOutput,
      ventyMode,
      setRate,
      fiO2,
      pip,
      peepCpap,
      ieRatio,
      otherVentilator,
      fourhrpulse,
      fourhrbloodPressure,
      fourhroxygenSaturation,
      fourhrTemperature,
      fourhrbloodSugarLevel,
      fourhrotherVitals,
      fourhrurine,
      fourhrivFluid,
    } = req.body;
    const nurseId = req.userId; // Nurse ID from authenticated user
    console.log(req.body);
    // Validate user type to ensure only nurses can add follow-ups
    if (req.usertype !== "nurse") {
      return res
        .status(403)
        .json({ message: "Access denied. Only nurses can add follow-ups." });
    }

    // Validate nurse ID
    const nurse = await Nurse.findById(nurseId);
    if (!nurse) {
      return res.status(404).json({ message: "Nurse not found" });
    }

    // Find the patient
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the admission record
    const admissionRecord = patient.admissionRecords.id(admissionId);
    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    const dateInIST = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: true,
    });

    // Add follow-up to the admission record
    admissionRecord.followUps.push({
      nurseId: nurseId,
      notes: notes,
      observations: observations,
      temperature,
      pulse,
      respirationRate,
      bloodPressure,
      oxygenSaturation,
      bloodSugarLevel,
      otherVitals,
      ivFluid,
      nasogastric,
      rtFeedOral,
      totalIntake,
      cvp,
      urine,
      stool,
      rtAspirate,
      otherOutput,
      ventyMode,
      setRate,
      fiO2,
      pip,
      peepCpap,
      ieRatio,
      otherVentilator,
      fourhrpulse,
      fourhrbloodPressure,
      fourhroxygenSaturation,
      fourhrTemperature,
      fourhrbloodSugarLevel,
      fourhrotherVitals,
      fourhrurine,
      fourhrivFluid,
      date: dateInIST, // Sets the date to now
    });

    // Save the updated patient record
    await patient.save();

    return res.status(201).json({
      message: "Follow-up added successfully",
      admissionRecord: admissionRecord,
    });
  } catch (error) {
    console.error("Error adding follow-up:", error);
    return res
      .status(500)
      .json({ message: "Error adding follow-up", error: error.message });
  }
};
export const getLastFollowUpTime = async (req, res) => {
  try {
    const { patientId, admissionId } = req.body;

    // Find the patient
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the admission record
    const admissionRecord = patient.admissionRecords.id(admissionId);
    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Check if there is a previous follow-up
    if (admissionRecord.followUps.length === 0) {
      return res.status(200).json({ message: "No previous follow-ups found" });
    }

    // Get the last follow-up
    const lastFollowUp =
      admissionRecord.followUps[admissionRecord.followUps.length - 1];
    const rawLastFollowUpDate = lastFollowUp.date; // The raw date string
    console.log("Last Follow-Up Date (Raw):", rawLastFollowUpDate);

    // Parse the raw date string into a Date object
    const lastFollowUpDate = new Date(rawLastFollowUpDate);

    // Log the parsed date
    console.log("Parsed Last Follow-Up Date:", lastFollowUpDate);

    // Get the current time in Indian timezone
    const currentTime = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    });
    const currentDate = new Date(currentTime);

    // Calculate the time difference in milliseconds
    const diffInMillis = Math.abs(currentDate - lastFollowUpDate);
    const diffInMinutes = Math.floor(diffInMillis / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const minutesRemaining = diffInMinutes % 60;

    const timeSinceLastFollowUp = `${diffInHours} hours and ${minutesRemaining} minutes ago`;

    res.status(200).json({
      message: "Last follow-up found",
      lastFollowUpDate: lastFollowUpDate.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "short",
        timeStyle: "long",
      }), // Include formatted date
      timeSinceLastFollowUp,
    });
  } catch (error) {
    console.error("Error retrieving last follow-up:", error);
    res.status(500).json({
      message: "Error retrieving last follow-up",
      error: error.message,
    });
  }
};
export const getFollowups = async (req, res) => {
  try {
    // Extract patientId and admissionId from the request parameters
    const { admissionId } = req.params;

    // Find the patient by admissionId
    const patient = await patientSchema
      .findOne({
        "admissionRecords._id": admissionId,
      })
      .select("admissionRecords");

    // Check if patient exists
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission record using the admissionId
    const admissionRecord = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );

    // If the admission record does not have follow-ups
    if (!admissionRecord || !admissionRecord.followUps) {
      return res.status(404).json({ message: "No follow-ups found" });
    }

    // Return the follow-ups for the specific admission
    res.status(200).json(admissionRecord.followUps);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
export const getNurseProfile = async (req, res) => {
  const nurseId = req.userId; // Get nurseId from the request

  try {
    // Find the doctor by ID
    const nurseProfile = await Nurse.findById(nurseId).select("-password"); // Exclude password for security

    // Check if doctor profile exists
    if (!nurseProfile) {
      return res.status(404).json({ message: "nurse not found" });
    }

    // Return doctor profile
    return res.status(200).json({ nurseProfile });
  } catch (error) {
    console.error("Error fetching nurse profile:", error);
    return res
      .status(500)
      .json({ message: "Error fetching nurse profile", error: error.message });
  }
};
export const getAdmissionRecordsById = async (req, res) => {
  try {
    const { admissionId } = req.params; // Get admissionId from URL parameters

    // Find the patient by checking all admission records
    const patient = await patientSchema.findOne({
      "admissionRecords._id": admissionId,
    });

    // If the patient is not found
    if (!patient) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Find the specific admission record
    const admissionRecord = patient.admissionRecords.id(admissionId);

    // If the admission record is not found
    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Respond with the admission record
    res.status(200).json({
      message: "Admission record retrieved successfully.",
      admissionRecord,
    });
  } catch (error) {
    console.error("Error retrieving admission record:", error);
    res.status(500).json({
      message: "Error retrieving admission record.",
      error: error.message,
    });
  }
};
