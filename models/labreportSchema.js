import mongoose from "mongoose";

const labReportSchema = new mongoose.Schema({
  admissionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Patient.admissionRecords", // Reference to the admission record
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Patient", // Reference to Patient
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "hospitalDoctor", // Reference to the doctor
  },
  labTestNameGivenByDoctor: {
    type: String,
    required: true,
    default: " ", // Default value for the doctor who gave the lab test name. This can be updated by the doctor later.
  },
  reports: [
    {
      labTestName: { type: String }, // Name of the lab test (e.g., Blood Test)
      reportUrl: { type: String }, // URL to the uploaded PDF
      labType: { type: String, required: true }, // Type of the lab (text field for lab name or type)
      uploadedAt: { type: Date, default: Date.now }, // Timestamp for when the report was uploaded
    },
  ],
});

const LabReport = mongoose.model("LabReport", labReportSchema);
export default LabReport;
