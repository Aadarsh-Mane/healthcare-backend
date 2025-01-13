// models/nurseSchema.js
import mongoose from "mongoose";

const nurseSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  nurseName: { type: String },
  password: { type: String, required: true },
  usertype: { type: String, required: true, default: "nurse" },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" }, // Reference to the associated doctor
});

const Nurse = mongoose.model("Nurse", nurseSchema);
export default Nurse;
