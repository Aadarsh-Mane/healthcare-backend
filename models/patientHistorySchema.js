import mongoose from "mongoose";

// Patient History Schema

// 2-hour follow-up sub-schema

// Follow-up schema
const followUpSchema = new mongoose.Schema({
  nurseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Nurse",
    required: true,
  }, // Nurse who recorded the follow-up
  date: { type: String },

  notes: { type: String, required: true },
  observations: { type: String },
  temperature: { type: Number }, // T (Temperature)
  pulse: { type: Number }, // P (Pulse)
  respirationRate: { type: Number }, // R (Respiration Rate)
  bloodPressure: { type: String }, // Non-Invasive Blood Pressure
  oxygenSaturation: { type: Number }, // SpO2 (Oxygen Saturation)
  bloodSugarLevel: { type: Number }, // BSL (Blood Sugar Level)
  otherVitals: { type: String }, // OTHER (Any other vitals to be recorded)

  // Intake data (IV Fluids, Nasogastric, Feed, etc.)
  ivFluid: { type: String }, // I.V. Fluid (Intravenous fluids administered)
  nasogastric: { type: String }, // Nasogastric (Input through nasogastric tube)
  rtFeedOral: { type: String }, // RT Feed/Oral (Feed given via RT or orally)
  totalIntake: { type: String }, // Total (Total intake of fluids)
  cvp: { type: String }, // CVP (Central Venous Pressure)

  // Output data (Urine, Stool, RT Aspirate, etc.)
  urine: { type: String }, // Urine (Urinary output)
  stool: { type: String }, // Stool (Stool output)
  rtAspirate: { type: String }, // RT Aspirate (Output through Ryle's Tube aspirate)
  otherOutput: { type: String }, // Other (Any other output)

  // Ventilator data (Mode, Rate, FiO2, etc.)
  ventyMode: { type: String }, // VentyMode (Ventilator Mode)
  setRate: { type: Number }, // Set Rate (Set ventilator rate)
  fiO2: { type: Number }, // FiO2 (Fraction of Inspired Oxygen)
  pip: { type: Number }, // PIP (Peak Inspiratory Pressure)
  peepCpap: { type: String }, // PEEP/CPAP (Positive End-Expiratory Pressure/Continuous Positive Airway Pressure)
  ieRatio: { type: String }, // I:E Ratio (Inspiratory to Expiratory Ratio)
  otherVentilator: { type: String }, // Other (Any

  fourhrpulse: { type: String },
  fourhrbloodPressure: { type: String },
  fourhroxygenSaturation: { type: String },
  fourhrTemperature: { type: String },
  fourhrbloodSugarLevel: { type: String },
  fourhrotherVitals: { type: String },
  fourhrivFluid: { type: String },
  fourhrurine: { type: String },
});

const patientHistorySchema = new mongoose.Schema({
  patientId: { type: String, unique: true, required: true }, // Same patientId as in Patient schema
  name: { type: String, required: true }, // Redundant for easier history tracking
  gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
  contact: { type: String }, // Optional for history purposes
  age: { type: String },
  // Historical records
  history: [
    {
      admissionId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Reference to admission
      admissionDate: Date,
      dischargeDate: Date, // When the patient was discharged
      reasonForAdmission: String,
      doctorConsultant: { type: [String] },
      amountToBePayed: { type: Number }, //
      dischargedByReception: {
        type: Boolean, //
        default: false,
      },
      conditionAtDischarge: String,
      previousRemainingAmount: { type: Number },
      symptoms: String,
      initialDiagnosis: String,
      doctor: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: "hospitalDoctor" },
        name: String,
      },
      reports: [{ type: mongoose.Schema.Types.ObjectId, ref: "PatientReport" }],
      followUps: [followUpSchema], // Array of follow-up records for each admission

      labReports: [
        {
          labTestNameGivenByDoctor: String, // Test name requested by doctor
          reports: [
            {
              labTestName: String, // Name of the lab test
              reportUrl: String, // URL to the uploaded PDF
              labType: String, // Type of lab (e.g., hematology)
              uploadedAt: { type: Date, default: Date.now }, // Timestamp
            },
          ],
        },
      ], // New field for lab reports
      weight: { type: Number },
      doctorPrescriptions: [
        {
          medicine: {
            name: { type: String }, // Name of the medicine
            morning: { type: String }, // Morning dose
            afternoon: { type: String }, // Afternoon dose
            night: { type: String }, // Night dose
            comment: { type: String }, // Additional comments
            date: { type: Date, default: Date.now }, // Timestamp
          },
        },
      ],
      doctorConsulting: [
        {
          allergies: { type: String },
          cheifComplaint: { type: String },
          describeAllergies: { type: String },
          historyOfPresentIllness: { type: String },
          personalHabits: { type: String },
          familyHistory: { type: String },
          menstrualHistory: { type: String },
          wongBaker: { type: String },
          visualAnalogue: { type: String },
          relevantPreviousInvestigations: { type: String },
          immunizationHistory: { type: String },
          pastMedicalHistory: { type: String },
        },
      ],
      symptomsByDoctor: { type: [String] }, // Array to store symptoms added by the doctor
      vitals: [
        {
          temperature: { type: Number },
          pulse: { type: Number },
          other: { type: String },
          recordedAt: { type: Date, default: Date.now },
        },
      ],
      diagnosisByDoctor: { type: [String] }, // Array to store diagnoses added by the doctor
    },
  ],
});

const PatientHistory = mongoose.model("PatientHistory", patientHistorySchema);
export default PatientHistory;
