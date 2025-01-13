import mongoose from "mongoose";

const hospitalDoctor = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // username: { type: String, required: true },
  usertype: { type: String, required: true }, // Could be 'doctor' or another type if expanded
  doctorName: { type: String, required: true }, // Doctor name for reference
  fcmToken: { type: String, default: "" }, // Add this field for FCM token
  speciality: { type: String },
  experience: { type: String },
  department: { type: String },
  phoneNumber: { type: String },
  imageUrl: {
    type: String,
  },
  createdAt: { type: Date, default: Date.now },
});

const hospitalDoctors = mongoose.model("hospitalDoctor", hospitalDoctor);

export default hospitalDoctors;
