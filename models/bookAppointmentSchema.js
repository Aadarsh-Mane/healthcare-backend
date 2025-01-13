// models/appointmentSchema.js
import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient" }, // Optional for non-patient appointments
  date: { type: Date, required: true },
  reason: { type: String },
  status: {
    type: String,
    enum: ["Pending", "Confirmed", "Completed"],
    default: "Pending",
  },

  // Additional fields for non-registered patients
  name: { type: String },
  contact: { type: String },
  note: { type: String }, // Add the note field here
});

const Appointment = mongoose.model("Appointment", appointmentSchema);
export default Appointment;
