import mongoose from "mongoose";

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
const prescriptionSchema = new mongoose.Schema({
  medicine: {
    name: { type: String }, // Name of the medicine
    morning: { type: String }, // Whether to take in the morning
    afternoon: { type: String }, // Whether to take in the afternoon
    night: { type: String }, // Whether to take at night
    comment: { type: String }, // Additional comments
    date: { type: Date, default: Date.now }, // Timestamp for when the prescription was added
  },
});
const consultantSchema = new mongoose.Schema({
  allergies: { type: String }, // Name of the medicine
  cheifComplaint: { type: String }, // Whether to take in the morning
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
  date: { type: String },
});

const admissionRecordSchema = new mongoose.Schema({
  admissionDate: { type: Date, default: Date.now },
  status: { type: String, default: "Pending" },
  reasonForAdmission: { type: String },
  doctorConsultant: { type: [String] },
  conditionAtDischarge: {
    type: String,
    enum: ["Discharged", "Transferred", "A.M.A.", "Absconded", "Expired"],
    default: "Discharged",
  },
  amountToBePayed: { type: Number },
  dischargeDate: { type: Date },
  weight: { type: Number },
  symptoms: { type: String },
  initialDiagnosis: { type: String },
  doctor: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "hospitalDoctor" },
    name: { type: String },
  },
  followUps: [followUpSchema], // Array of follow-up records for each admission
  doctorPrescriptions: [prescriptionSchema], // Array of prescriptions
  doctorConsulting: [consultantSchema],
  symptomsByDoctor: { type: [String] }, // Array to store symptoms added by the doctor

  vitals: [
    {
      temperature: { type: Number }, // Temperature in Celsius or Fahrenheit
      pulse: { type: Number }, // Pulse rate
      other: { type: String }, // For additional vital information
      recordedAt: { type: Date, default: Date.now }, // Timestamp for when the vitals were recorded
    },
  ],

  diagnosisByDoctor: { type: [String] }, // Array to store diagnoses added by the doctor
});

const patientSchema1 = new mongoose.Schema({
  patientId: { type: String, unique: true }, // Unique Patient ID
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
  contact: { type: String, required: true },
  address: { type: String },
  dob: { type: String },
  imageUrl: {
    type: String,
    default: " ",
  },
  discharged: { type: Boolean, default: false },
  pendingAmount: { type: Number, default: 0 },
  admissionRecords: [admissionRecordSchema],
  followUps: [followUpSchema], // Array of follow-up records for each admission
});

const patientSchema = mongoose.model("Patient", patientSchema1);
export default patientSchema;
