import Doctor from "./models/doctorSchema.js";
import mongoose from "mongoose";
async function addDoctor(name, type) {
  try {
    mongoose.connect(
      "mongodb+srv://20sdeveloper4209:vijay207@cluster0.yxnl8.mongodb.net/doctor?retryWrites=true&w=majority&appName=doctorEcosystem",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 50000, // Timeout after 5 seconds
      }
    );
    const existingDoctor = await Doctor.findOne({ name });
    if (existingDoctor) {
      console.log(`Doctor ${name} is already added.`);
      return;
    }

    const doctor = new Doctor({ name, type });
    await doctor.save();
    console.log(`Doctor ${name} added successfully.`);
  } catch (error) {
    console.error("Error adding doctor:", error.message);
  }
}

// Sample Doctors Data
const sampleDoctors = [
  { name: "Dr. Alice Smith", type: "Cardiologist" },
  { name: "Dr. Bob Johnson", type: "Dermatologist" },
  { name: "Dr. Carol Lee", type: "Neurologist" },
  { name: "Dr. Daniel Wilson", type: "Pediatrician" },
  { name: "Dr. Eve Carter", type: "Orthopedic" },
];

// Function to populate sample data
async function populateSampleDoctors() {
  for (const doc of sampleDoctors) {
    await addDoctor(doc.name, doc.type);
  }
}

populateSampleDoctors().then(() => {
  console.log("Sample data population complete.");
  mongoose.connection.close();
});
