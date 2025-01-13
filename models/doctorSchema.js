import mongoose from "mongoose";
const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  type: { type: String, required: true },
});

const Doctor = mongoose.model("Doctor", doctorSchema);

export default Doctor;

// dbConnect.js
