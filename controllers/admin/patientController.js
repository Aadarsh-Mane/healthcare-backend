import Appointment from "../../models/bookAppointmentSchema.js";
import patientSchema from "../../models/patientSchema.js";

export const createNonPatientAppointment = async (req, res) => {
  const { name, contact, date, reason } = req.body;

  try {
    // Create a new appointment for a non-registered individual
    const appointment = new Appointment({
      name,
      contact,
      date: new Date(date),
      reason,
      status: "Pending", // Initially set to pending
    });

    await appointment.save();

    res.status(201).json({
      message: `Appointment booked successfully for ${name}`,
      appointmentDetails: appointment,
    });
  } catch (error) {
    console.error("Error booking non-patient appointment:", error);
    res
      .status(500)
      .json({ message: "Error booking appointment", error: error.message });
  }
};
export const getPatientDetailsById = async (req, res) => {
  const { patientId } = req.params; // Expecting patientId from request parameters

  try {
    // Find the patient by patientId
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Return patient details along with admission records
    res.status(200).json({
      message: "Patient details retrieved successfully",
      patientDetails: patient,
    });
  } catch (error) {
    console.error("Error retrieving patient details:", error);
    res.status(500).json({
      message: "Error retrieving patient details",
      error: error.message,
    });
  }
};
