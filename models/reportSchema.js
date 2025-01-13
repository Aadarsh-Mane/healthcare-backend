import mongoose from "mongoose";

const patientReportSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: true,
  },
  diagnosis: { type: String, required: true },
  treatment: { type: String, required: true },
  notes: String,
  date: { type: Date, default: Date.now },
});

const patientReport = mongoose.model("PatientReport", patientReportSchema);
export default patientReport;
