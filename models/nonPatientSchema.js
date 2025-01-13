import mongoose from "mongoose";
const otpSchema = new mongoose.Schema({
  code: { type: String },
  expiresAt: { type: Date, index: { expires: "3m" } }, // 3 minutes TTL
});

const NonPatientSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  age: { type: String, required: true, unique: true },
  gender: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String, required: true, unique: true }, // New field for phone number

  password: { type: String, required: true },
  otp: otpSchema, // Embedding OTP schema with expiration
});

const NonPatient = mongoose.model("NonPatient", NonPatientSchema);

export default NonPatient;

// dbConnect.js
