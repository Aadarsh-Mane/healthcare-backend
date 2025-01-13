import { client } from "../../helpers/twilio.js";
import Appointment from "../../models/bookAppointmentSchema.js";
import hospitalDoctors from "../../models/hospitalDoctorSchema.js";
import PatientHistory from "../../models/patientHistorySchema.js";
import patientSchema from "../../models/patientSchema.js";
import { sendNotification } from "../notifyController.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { fileURLToPath } from "url"; // To handle __dirname in ESM
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import puppeteer from "puppeteer";
import { response } from "express";
import mongoose from "mongoose";
import pdf from "html-pdf";
import dotenv from "dotenv";
dotenv.config(); // Load environment variables from .env file
dayjs.extend(utc);
dayjs.extend(timezone);
// export const addPatient = async (req, res) => {
//   const {
//     name,
//     age,
//     gender,
//     contact,
//     address,
//     weight,
//     caste,
//     reasonForAdmission,
//     symptoms,
//     initialDiagnosis,
//     isReadmission
//   } = req.body;

//   try {
//     let patient = await patientSchema.findOne({ name, contact });

//     if (patient) {
//       let daysSinceLastAdmission = null;

//       // Check if the patient has been discharged
//       if (!patient.discharged) {
//         // If not discharged, calculate days since last admission
//         if (patient.admissionRecords.length > 0) {
//           const lastAdmission =
//             patient.admissionRecords[patient.admissionRecords.length - 1]
//               .admissionDate;
//           daysSinceLastAdmission = dayjs().diff(dayjs(lastAdmission), "day");
//         }
//       } else {
//         // Patient has been discharged, check history for the last discharge date
//         let patientHistory = await PatientHistory.findOne({
//           patientId: patient.patientId,
//         });

//         if (patientHistory) {
//           // Fetch the latest discharge date from the history
//           const lastDischarge = patientHistory.history
//             .filter((entry) => entry.dischargeDate)
//             .sort((a, b) =>
//               dayjs(b.dischargeDate).isBefore(a.dischargeDate) ? -1 : 1
//             )[0];

//           if (lastDischarge) {
//             // Calculate the days since last discharge
//             daysSinceLastAdmission = dayjs().diff(
//               dayjs(lastDischarge.dischargeDate),
//               "day"
//             );
//           }
//         }

//         // Set discharged status to false for re-admission
//         patient.discharged = false;
//       }

//       // Add new admission record
//       patient.admissionRecords.push({
//         admissionDate: new Date(),
//         reasonForAdmission,
//         symptoms,
//         initialDiagnosis,
//       });

//       // Save updated patient record
//       await patient.save();

//       return res.status(200).json({
//         message: `Patient ${name} re-admitted successfully.`,
//         patientDetails: patient,
//         daysSinceLastAdmission,
//         admissionRecords: patient.admissionRecords,
//       });
//     }

//     // If patient does not exist, create a new one with a generated patientId
//     const patientId = generatePatientId(name);

//     patient = new patientSchema({
//       patientId,
//       name,
//       age,
//       gender,
//       contact,
//       address,
//       weight,
//       caste,
//       admissionRecords: [
//         {
//           admissionDate: new Date(),
//           reasonForAdmission,
//           symptoms,
//           initialDiagnosis,
//         },
//       ],
//     });
//     await patient.save();
//     // const messageBody = `Dear ${name}, welcome to our spandan hospital. Your patient ID is ${patientId}. Wishing you a speedy recovery!`;

//     // await client.messages.create({
//     //   from: "+14152149378", // Twilio phone number
//     //   to: contact,
//     //   body: messageBody,
//     // });

//     res.status(200).json({
//       message: `Patient ${name} added successfully with ID ${patientId}.`,
//       patientDetails: patient,
//     });
//   } catch (error) {
//     console.error("Error adding patient:", error);
//     res
//       .status(500)
//       .json({ message: "Error adding patient", error: error.message });
//   }
// };
// const generatePatientId = (name) => {
//   const initials = name.slice(0, 3).toUpperCase(); // First three letters of the name
//   const randomDigits = Math.floor(100 + Math.random() * 900); // Generate three random digits
//   return `${initials}${randomDigits}`;
// };
export const addPatient = async (req, res) => {
  const {
    name,
    age,
    gender,
    contact,
    address,
    weight,
    caste,
    dob,
    reasonForAdmission,
    symptoms,
    initialDiagnosis,
    isReadmission,
  } = req.body;
  const file = req.file;
  try {
    console.log(req.body);
    let patient;
    if (file) {
      const auth = new google.auth.GoogleAuth({
        credentials: ServiceAccount,
        scopes: ["https://www.googleapis.com/auth/drive"],
      });
      const drive = google.drive({ version: "v3", auth });

      // Convert buffer to a readable stream
      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);

      // Upload file to Google Drive
      const fileMetadata = {
        name: file.originalname, // Use the original file name
        parents: ["1Trbtp9gwGwNF_3KNjNcfL0DHeSUp0HyV"], // Replace with your shared folder ID
      };
      const media = {
        mimeType: file.mimetype,
        body: bufferStream, // Stream the buffer directly
      };

      const uploadResponse = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: "id, webViewLink",
      });

      const imageUrl = uploadResponse.data.webViewLink; // Link to the uploaded file

      if (isReadmission === "true") {
        // Fetch patient by name and contact (or implement different search criteria)
        // patient = await patientSchema.findOne({ name, contact });
        if (!req.body.patientId)
          return res
            .status(404)
            .json({ error: "Patient ID is required for readmission." });
        patient = await patientSchema.findOne({
          patientId: req.body.patientId,
        }); // Assuming patientId is provided for readmission
        if (!patient.discharged)
          return res
            .status(400)
            .json({ message: "Patient is not discharged." });
        if (patient) {
          let daysSinceLastAdmission = null;

          // Check if the patient has been discharged
          if (!patient.discharged) {
            // Calculate days since last admission if not discharged
            if (patient.admissionRecords.length > 0) {
              const lastAdmission =
                patient.admissionRecords[patient.admissionRecords.length - 1]
                  .admissionDate;
              daysSinceLastAdmission = dayjs().diff(
                dayjs(lastAdmission),
                "day"
              );
            }
          } else {
            // If discharged, check discharge history
            const patientHistory = await PatientHistory.findOne({
              patientId: patient.patientId,
            });

            if (patientHistory) {
              // Fetch the latest discharge date
              const lastDischarge = patientHistory.history
                .filter((entry) => entry.dischargeDate)
                .sort((a, b) =>
                  dayjs(b.dischargeDate).isBefore(a.dischargeDate) ? -1 : 1
                )[0];

              if (lastDischarge) {
                daysSinceLastAdmission = dayjs().diff(
                  dayjs(lastDischarge.dischargeDate),
                  "day"
                );
              }
            }

            // Set discharged status to false for re-admission
            patient.discharged = false;
          }

          // Update all patient details
          patient.name = name;
          patient.age = age;
          patient.gender = gender;
          patient.contact = contact;
          patient.address = address;
          patient.caste = caste;
          patient.imageUrl = imageUrl;

          // Add new admission record for re-admission
          patient.admissionRecords.push({
            admissionDate: new Date(),
            reasonForAdmission,
            weight,
            symptoms,
            initialDiagnosis,
          });

          // Save updated patient record
          await patient.save();

          return res.status(200).json({
            message: `Patient ${name} re-admitted successfully.`,
            patientDetails: patient,
            daysSinceLastAdmission,
            admissionRecords: patient.admissionRecords,
          });
        } else {
          return res
            .status(404)
            .json({ message: "Patient not found for readmission." });
        }
      } else {
        // If not a readmission, create a new patient
        const patientId = generatePatientId(name);

        patient = new patientSchema({
          patientId,
          name,
          age,
          gender,
          contact,
          address,
          caste,
          imageUrl,
          admissionRecords: [
            {
              admissionDate: new Date(),
              reasonForAdmission,
              symptoms,
              initialDiagnosis,
              weight,
            },
          ],
        });

        await patient.save();

        return res.status(200).json({
          message: `Patient ${name} added successfully with ID ${patientId}.`,
          patientDetails: patient,
        });
      }
    } else {
      if (isReadmission === "true") {
        // Fetch patient by name and contact (or implement different search criteria)
        // patient = await patientSchema.findOne({ name, contact });
        if (!req.body.patientId)
          return res
            .status(404)
            .json({ error: "Patient ID is required for readmission." });
        patient = await patientSchema.findOne({
          patientId: req.body.patientId,
        }); // Assuming patientId is provided for readmission
        if (!patient.discharged)
          return res
            .status(400)
            .json({ message: "Patient is not discharged." });
        if (patient) {
          let daysSinceLastAdmission = null;

          // Check if the patient has been discharged
          if (!patient.discharged) {
            // Calculate days since last admission if not discharged
            if (patient.admissionRecords.length > 0) {
              const lastAdmission =
                patient.admissionRecords[patient.admissionRecords.length - 1]
                  .admissionDate;
              daysSinceLastAdmission = dayjs().diff(
                dayjs(lastAdmission),
                "day"
              );
            }
          } else {
            // If discharged, check discharge history
            const patientHistory = await PatientHistory.findOne({
              patientId: patient.patientId,
            });

            if (patientHistory) {
              // Fetch the latest discharge date
              const lastDischarge = patientHistory.history
                .filter((entry) => entry.dischargeDate)
                .sort((a, b) =>
                  dayjs(b.dischargeDate).isBefore(a.dischargeDate) ? -1 : 1
                )[0];

              if (lastDischarge) {
                daysSinceLastAdmission = dayjs().diff(
                  dayjs(lastDischarge.dischargeDate),
                  "day"
                );
              }
            }

            // Set discharged status to false for re-admission
            patient.discharged = false;
          }

          // Update all patient details
          patient.name = name;
          patient.age = age;
          patient.gender = gender;
          patient.contact = contact;
          patient.address = address;
          patient.caste = caste;

          // Add new admission record for re-admission
          patient.admissionRecords.push({
            admissionDate: new Date(),
            reasonForAdmission,
            weight,
            symptoms,
            initialDiagnosis,
          });

          // Save updated patient record
          await patient.save();

          return res.status(200).json({
            message: `Patient ${name} re-admitted successfully.`,
            patientDetails: patient,
            daysSinceLastAdmission,
            admissionRecords: patient.admissionRecords,
          });
        } else {
          return res
            .status(404)
            .json({ message: "Patient not found for readmission." });
        }
      } else {
        // If not a readmission, create a new patient
        const patientId = generatePatientId(name);

        patient = new patientSchema({
          patientId,
          name,
          age,
          gender,
          contact,
          address,
          caste,
          admissionRecords: [
            {
              admissionDate: new Date(),
              reasonForAdmission,
              symptoms,
              initialDiagnosis,
              weight,
            },
          ],
        });

        await patient.save();

        return res.status(200).json({
          message: `Patient ${name} added successfully with ID ${patientId}.`,
          patientDetails: patient,
        });
      }
    }
  } catch (error) {
    console.error("Error adding patient:", error);
    res
      .status(500)
      .json({ message: "Error adding patient", error: error.message });
  }
};

const generatePatientId = (name) => {
  const initials = name.slice(0, 3).toUpperCase(); // First three letters of the name
  const randomDigits = Math.floor(100 + Math.random() * 900); // Generate three random digits
  return `${initials}${randomDigits}`;
};

export const acceptAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const { note } = req.body; // Optional note field

  try {
    // Find the appointment by ID
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Update status and note
    appointment.status = "Confirmed";
    if (note) appointment.note = note;

    await appointment.save();

    res.status(200).json({
      message: `Appointment for ${appointment.name} confirmed successfully.`,
      appointmentDetails: appointment,
    });
  } catch (error) {
    console.error("Error confirming appointment:", error);
    res
      .status(500)
      .json({ message: "Error confirming appointment", error: error.message });
  }
};
export const assignDoctor = async (req, res) => {
  try {
    const { patientId, doctorId, admissionId, isReadmission } = req.body;

    // Find the patient
    const patient = await patientSchema.findOne({ patientId });
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the doctor
    const doctor = await hospitalDoctors.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Check if admission record exists
    const admissionRecord = patient.admissionRecords.id(admissionId);
    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found" });
    }
    // if (admissionRecord.doctor && admissionRecord.doctor.id.equals(doctorId)) {
    //   return res
    //     .status(400)
    //     .json({ message: "Doctor is already assigned to this patient" });
    // }
    // Assign doctor to admission record
    admissionRecord.doctor = { id: doctorId, name: doctor.doctorName };
    await patient.save();

    // Check if doctor has FCM token
    if (doctor.fcmToken) {
      // Send notification to the doctor
      const title = "New Patient Assignment";
      const body = `You have been assigned a new patient: ${patient.name}`;
      await sendNotification(doctor.fcmToken, title, body);
    } else {
      console.warn("Doctor does not have an FCM token. Notification not sent.");
    }

    return res
      .status(200)
      .json({ message: "Doctor assigned successfully", patient });
  } catch (error) {
    console.error("Error assigning doctor:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};
// Controller to list all available doctors
export const listDoctors = async (req, res) => {
  try {
    // Retrieve all doctors, with an option to filter by availability if required
    const doctors = await hospitalDoctors
      .find({
        usertype: "doctor",
        // available: true,
      })
      .select("-password -createdAt -fcmToken");

    if (!doctors || doctors.length === 0) {
      return res.status(404).json({ message: "No available doctors found." });
    }

    res.status(200).json({ doctors });
  } catch (error) {
    console.error("Error listing doctors:", error);
    res
      .status(500)
      .json({ message: "Failed to retrieve doctors.", error: error.message });
  }
};
// Controller to list all patients
export const listPatients = async (req, res) => {
  try {
    // Retrieve all patients from the database
    const patients = await patientSchema.find().sort({ _id: -1 });

    if (!patients || patients.length === 0) {
      return res.status(404).json({ message: "No patients found." });
    }

    res.status(200).json({ patients });
  } catch (error) {
    console.error("Error listing patients:", error);
    res
      .status(500)
      .json({ message: "Failed to retrieve patients.", error: error.message });
  }
};
export const getDoctorsPatient = async (req, res) => {
  try {
    const { doctorName } = req.params; // Assuming doctor name is passed as a query parameter

    // Find patients where any admission record has the specified doctor name
    const patients = await patientSchema.find({
      admissionRecords: {
        $elemMatch: { "doctor.name": doctorName },
      },
    });

    // If no patients are found, return a 404 message
    if (!patients || patients.length === 0) {
      return res
        .status(404)
        .json({ message: "No patients found for this doctor" });
    }

    // Return the list of patients assigned to this doctor
    return res.status(200).json({ patients });
  } catch (error) {
    console.error("Error retrieving doctor's patients:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

export const getDischargedPatientHistory = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({ error: "Patient ID is required." });
    }

    const patientHistory = await PatientHistory.aggregate([
      {
        $match: { patientId: patientId }, // Match the specific patient by ID
      },
      {
        $project: {
          _id: 0,
          patientId: 1,
          name: 1,
          gender: 1,
          contact: 1,
          lastRecord: { $arrayElemAt: ["$history", -1] }, // Get the last element of the history array
        },
      },
    ]);

    if (patientHistory.length === 0) {
      return res
        .status(404)
        .json({ error: "Patient not found or no history available." });
    }

    const result = patientHistory[0];

    // Format the dates in the last record
    if (result.lastRecord) {
      const lastRecord = result.lastRecord;
      lastRecord.admissionDate = dayjs(lastRecord.admissionDate)
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DD hh:mm:ss A"); // Format: 2025-01-04 03:18:43 PM
      lastRecord.dischargeDate = dayjs(lastRecord.dischargeDate)
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DD hh:mm:ss A");
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching patient history:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};
// export const dischargePatientByReception = async (req, res) => {
//   try {
//     const { patientId, admissionId, amountPaid } = req.body;

//     if (!patientId || !admissionId || amountPaid == null) {
//       return res.status(400).json({
//         error: "Patient ID, admission ID, and amount paid are required.",
//       });
//     }

//     // Find the patient record
//     const patient = await patientSchema.findOne({ patientId });

//     if (!patient) {
//       return res.status(404).json({ error: "Patient not found." });
//     }

//     // Find the admission record
//     const admissionRecord = patient.admissionRecords.find(
//       (record) => record._id.toString() === admissionId
//     );

//     if (!admissionRecord) {
//       return res.status(404).json({ error: "Admission record not found." });
//     }

//     // Calculate remaining amount
//     const { amountToBePayed } = admissionRecord;
//     const previousPendingAmount = patient.pendingAmount || 0;
//     const totalAmountDue = amountToBePayed + previousPendingAmount;
//     const newPendingAmount = totalAmountDue - amountPaid;

//     // Update admission record and patient pending amount
//     admissionRecord.dischargeDate = new Date(); // Set discharge date
//     admissionRecord.status = "Discharged"; // Update status
//     admissionRecord.previousRemainingAmount = previousPendingAmount;

//     // Update pending amount in the patient schema
//     patient.pendingAmount = Math.max(newPendingAmount, 0);
//     patient.discharged = newPendingAmount <= 0; // Mark as fully settled if no pending amount

//     await patient.save();

//     return res.status(200).json({
//       message: "Patient discharged successfully.",
//       updatedAdmissionRecord: admissionRecord,
//       updatedPendingAmount: patient.pendingAmount,
//     });
//   } catch (error) {
//     console.error("Error discharging patient:", error);
//     return res.status(500).json({ error: "Internal server error." });
//   }
// };
export const dischargePatientByReception = async (req, res) => {
  try {
    const { patientId, admissionId, amountPaid } = req.body;

    if (!patientId || !admissionId || amountPaid == null) {
      return res.status(400).json({
        error: "Patient ID, admission ID, and amount paid are required.",
      });
    }

    // Find the patient record
    const patient = await patientSchema.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({ error: "Patient not found." });
    }

    // Fetch the patient's history to get the most recent admission record
    const patientHistory = await PatientHistory.findOne({ patientId });

    if (!patientHistory || patientHistory.history.length === 0) {
      return res.status(404).json({ error: "Patient history not found." });
    }

    // Find the most recent admission record in the history
    const lastRecord =
      patientHistory.history[patientHistory.history.length - 1];
    const { amountToBePayed } = lastRecord;

    // Calculate remaining amount
    const previousPendingAmount = patient.pendingAmount || 0;
    const totalAmountDue = amountToBePayed + previousPendingAmount;
    const newPendingAmount = totalAmountDue - amountPaid;

    // Update the pending amount in the patient schema
    patient.pendingAmount = Math.max(newPendingAmount, 0); // Ensure no negative pending amount
    patient.discharged = newPendingAmount <= 0; // Mark as fully discharged if no pending amount

    await patient.save();

    return res.status(200).json({
      message: "Patient discharged successfully.",
      updatedPendingAmount: patient.pendingAmount,
    });
  } catch (error) {
    console.error("Error discharging patient:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};
const ServiceAccount = {
  type: "service_account",
  project_id: "doctor-dd7e8",
  private_key_id: "5966d0605cb722f31fbcfdcd716153ad34529ed0",
  private_key:
    "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDU8SYYtRBdRLgf\n9kRj70jHsNL6wj0s6I6NETYve1djm+okgfyAhU8MY0eKAexaaYQ+iJ9gRGaBoo1n\n7NMcMBd85HfKqYshuyyv/cqUIZKzRIn9czGkTkb2R2NsWRMfYWV7LeYfO3xkGWRD\nrII51YIJOujqNZMM3IJ4XiUkkww6iDC5ykEFtK7laPpXCL9ykdF9oMEybFtjF+1q\nVlh2PAilE7TzZWDnwjM5D6S2fdEj1WXDYMozsspBHOykk4RDcb1KkXjSSrbo5zTq\naCIuAxTHmA01EE5bJLP1DFrm+6VLMCjpZkdTxGOg8t3eMJ2L/o4ce8YW1QpBpc8x\ni5mjjYl1AgMBAAECggEAIr0ahXJYcpbI4PH4k0MQoP8wVBdHCqH/y3Sw3csl5Qql\nBoKsMj1NOYyiuZl5uQA4wkjgk0BlZqWhowAoKpOP6WCOSGIjYAPclPN2znaxq4w1\nZMMbqJ3ahsf7qMvZSkfF2fQRdCvsrZnU2RN2BUBXH/Fb2QWXcUQyBrf5ID/bAVs1\nJQKaSVT2cyRWPk6Q9t4DcXunpD7PXgFd8lyj/289SHMyf/0SDbNzcP5d+2zYj9D7\nSEXE7+n9odQRmIq+mRFIxIweyXY2w2H7aHpy5wtz00rQm+qFBlk+1VG3/JYMcOmu\nag/0E2JF3Pz1kjVh8/MZ6Plkc5++AGZ9oam+tqqoiwKBgQD3aE0HmOH7kMSewcM8\n0MYIxizFPQRLxIQ+O1aE+p/147Ey16SIgsc7oTnYFO1/TtxxCLvteMfHgrhHvqWK\ndRK9KR8JlzadojJAOI9U7AtVMThLNWDKxOupLrFhjA7eyYs0SlSLpuouNwnKe+FW\nQc+X4OB6gnM+pbgxkK3AM2WPwwKBgQDcVmpu1ZXNs+W6cmCYwhLLlwrLS1f0r8Nk\n9oAx0kg9PW2w/7Be4gFSKeAxFQ0OvHn6K5mLJc6QV6fPQL3zxtTbqubU3DYbLW2F\n7fZdI4zRA1EqiKrn+euT/F9TF0gS/00GQB8aSGjsJmdkaEjt6/9XD8T40+/5K+3a\nuv4kImNmZwKBgD9Uq6MuN2q1/B7Harq+lnLYh81VeSwL+e4UMmmH3jqLNmjVWoC3\nOVjCRJRThxf3j+Y/XhvDtyATDikPXEC9Bzb0t8U0t/5R7psR317VrXD5UHewCj7d\neZWtJiraN1RAMyoHfOzipT9/RzpVy7DQ19sA7XVuvyFiOmw1pMR2Y6ERAoGAOCcV\nzNVF7jyQqWmI0KV1IMmHiLPU4JkClPJ1TT0oB+Nl1xvymNvENmpRpnCU+VJzS5xc\n7yddc0/DhoAbaMsdaDYvycOtTlPPe7hfdvEebA4KW2qlE6WPshE5QfXG+oBx4svo\noUwe4UAQTXh+TZQ9aLSuIDPzDm9xmLLbHd5dsrUCgYA44Xm1h/kBmgaROuXjpJk+\nBY+N43Fx8EaXi2UGVSoRrdnk634nAJltQYaGeVPPwv+6I4Q2bBcL9VcjT8gNK43c\nImt+DRb9G2P6lfXBDGkPmHwmzhfszNEuyVglNLyggAWQgUcNZ7EmPYa43B6s3BXZ\nEZ3nHVzbmC/toUZ5OdiSFA==\n-----END PRIVATE KEY-----\n",
  client_email: "doctor-459@doctor-dd7e8.iam.gserviceaccount.com",
  client_id: "109450368952306583894",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/doctor-459%40doctor-dd7e8.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};

export const generateBillForDischargedPatient = async (req, res) => {
  try {
    const {
      patientId,
      bedCharges,
      procedureCharges,
      medicineCharges,
      doctorCharges,
      investigationCharges,
      status,
    } = req.body;

    if (!patientId) {
      return res.status(400).json({ error: "Patient ID is required." });
    }

    // Find the patient record
    const patient = await patientSchema.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({ error: "Patient not found." });
    }

    // Fetch the patient's most recent admission history
    const patientHistory = await PatientHistory.findOne({ patientId });

    if (!patientHistory || patientHistory.history.length === 0) {
      return res.status(404).json({ error: "Patient history not found." });
    }

    // Get the last record (most recent admission)
    const lastRecord =
      patientHistory.history[patientHistory.history.length - 1];
    const {
      name,
      gender,
      contact,
      weight,
      age,
      admissionDate,
      dischargeDate,
      reasonForAdmission,
      conditionAtDischarge,
      doctor,
    } = lastRecord;

    // Start with the pending amount from the patient schema and last admission record

    // Calculate bed charges dynamically (if provided)
    // Calculate bed charges dynamically
    let totalAmountDue = 0;

    // Calculate dynamic charges
    const calculateCharges = (charges, categories, rateKey, quantityKey) => {
      charges.total = 0;
      categories.forEach((type) => {
        const {
          [rateKey]: rate,
          [quantityKey]: quantity,
          date,
        } = charges[type] || {};
        if (rate && quantity > 0 && date) {
          const charge = rate * quantity;
          charges.total += charge;
          charges[type].total = charge;
        }
      });
      return charges.total;
    };

    if (bedCharges) {
      const bedCategories = ["icu", "singleAc", "singleRoom", "generalWard"];
      totalAmountDue += calculateCharges(
        bedCharges,
        bedCategories,
        "ratePerDay",
        "quantity"
      );
    }

    if (doctorCharges) {
      const doctorCategories = [
        "icuVisiting",
        "generalVisiting",
        "externalVisiting",
      ];
      totalAmountDue += calculateCharges(
        doctorCharges,
        doctorCategories,
        "ratePerVisit",
        "visits"
      );
    }

    if (procedureCharges) {
      const procedureCategories = ["oxygen"];
      totalAmountDue += calculateCharges(
        procedureCharges,
        procedureCategories,
        "ratePerUnit",
        "quantity"
      );
    }

    if (investigationCharges) {
      const investigationCategories = ["ecg", "xray", "ctScan", "sonography"];
      totalAmountDue += calculateCharges(
        investigationCharges,
        investigationCategories,
        "ratePerTest",
        "quantity"
      );
    }

    if (medicineCharges) {
      totalAmountDue += medicineCharges.total || 0;
    }

    // Apply ICS and other adjustments to the bill calculation

    // Calculate the remaining balance after payment

    // Update the pending amount in the patient schema
    // lastRecord.dischargedByReception = true;
    await patientHistory.save();
    // Save the updated patient record
    await patient.save();

    // Prepare the final bill details
    const billDetails = {
      patientId: patientId || "N/A",
      name: patient.name,
      gender: patient.gender,
      contact: patient.contact || "N/A",
      weight: weight || "N/A",
      age: patient.age || "N/A",
      admissionDate: admissionDate || "N/A",
      dischargeDate: dischargeDate || "N/A",
      reasonForAdmission: reasonForAdmission || "N/A",
      conditionAtDischarge: conditionAtDischarge || "N/A",
      doctorName: doctor?.name || "N/A",
      bedCharges: bedCharges || {},
      procedureCharges: procedureCharges || {},
      doctorCharges: doctorCharges || {},
      investigationCharges: investigationCharges || {},

      medicineCharges: medicineCharges || { totalCost: 0 },
      totalAmountDue: totalAmountDue || 0,
      amountPaid: status?.amountPaid || 0,
      remainingBalance: status?.remainingBalance || 0,
      dischargeStatus: patient.discharged
        ? "Fully Discharged"
        : "Pending Balance",
      paymentMode: status?.paymentMode || "N/A",
      insuranceCompany: status?.insuranceCompany || "N/A",
      conditionAtDischargePoint: status?.conditionAtDischargePoint || "N/A",
    };

    // HTML template for the bill
    const billHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hospital Bill</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            font-size: 12px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #ddd;
            padding-bottom: 20px;
        }
        img {
            background-color: transparent;
        }
        .header img {
            margin-bottom: 10px;
        }
        .header h1 {
            margin: 0;
            font-size: 22px;
            color: #333;
        }
        .header p {
            margin: 5px 0;
            font-size: 12px;
            color: #555;
        }
        .header-details {
            margin: 20px 0;
            font-size: 14px;
            line-height: 1.8;
        }
        .header-details strong {
            color: #000;
        }
        .patient-details {
            margin: 20px 0;
            padding: 15px;
            border: 2px solid #ddd;
            border-radius: 10px;
            display: flex;
            flex-wrap: wrap;
        }
        .patient-details div {
            width: 24%;
            margin-bottom: 10px;
        }
        .patient-details div strong {
            color: #000;
        }
        .charges {
            margin-top: 20px;
            width: 100%;
            border-collapse: collapse;
        }
        .charges th, .charges td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
        }
        .charges th {
            background-color: #f7f7f7;
            font-size: 14px;
        }
        .charges td {
            font-size: 12px;
        }
        .charges tr:hover {
            background-color: #f0f0f0;
        }
        .charges th[colspan="5"] {
            text-align: left;
            font-size: 14px;
            font-weight: bold;
            background-color: #e0e0e0;
        }
        .summary {
            margin-top: 30px;
            background-color: #f9f9f9;
            padding: 20px;
            border-radius: 10px;
            border: 1px solid #ddd;
        }
        .summary h2 {
            margin-top: 0;
            font-size: 18px;
            color: #444;
        }
        .summary p {
            margin: 10px 0;
            font-size: 14px;
            color: #333;
        }
        .summary strong {
            color: #000;
        }
        @page {
            size: A4;
            margin: 20mm;
        }
    </style>
</head>
<body>
    <div class="header">
        <img src="https://res.cloudinary.com/dnznafp2a/image/upload/v1736544247/cb6bdlgforsw3al3tz5l.png" alt="Hospital Logo" />
        <h1>Hospital Bill</h1>
    </div>
    <div class="patient-details">
        <tr>
            <td class="bold"><strong>Patient ID:</strong> <span id="patientId">${
              billDetails.patientId || "N/A"
            }</span></td>
            <td class="bold"><strong>Patient Name:</strong> <span id="name">${
              billDetails.name || "N/A"
            }</span></td>
        </tr>
        <tr>
            <td class="bold"><strong>Treating Doctor:</strong> <span id="doctorName">${
              billDetails.doctorName || "N/A"
            }</span></td>
            <td class="bold"><strong>Age:</strong> <span id="age">${
              billDetails.age || "N/A"
            }</span></td>
        </tr>
        <tr>
            <td class="bold"><strong>Weight:</strong> <span id="weight">${
              billDetails.weight || "N/A"
            }</span></td>
            <td class="bold"><strong>Status:</strong> <span id="status">${
              billDetails.status || "N/A"
            }</span></td>
        </tr>
        <tr>
            <td class="bold"><strong>Payment Mode:</strong> <span id="paymentMode">${
              billDetails.paymentMode || "N/A"
            }</span></td>
            <td class="bold"><strong>Insurance Company:</strong> <span id="insuranceCompany">${
              billDetails.insuranceCompany || "N/A"
            }</span></td>
        </tr>
        
    </div>
    <table class="charges">
        <tr>
            <th>Description</th>
            <th>Rate per Day</th>
            <th>Quantity</th>
            <th>Date</th>
            <th>Total</th>
        </tr>
        <tr><th colspan="5">Bed Charges Breakdown</th></tr>
        <tr>
            <td>ICU Bed Charges</td>
            <td>${billDetails.bedCharges.icu.ratePerDay || 0}</td>
            <td>${billDetails.bedCharges.icu.quantity || 0}</td>
            <td>${billDetails.bedCharges.icu.date || "N/A"}</td>
            <td>${billDetails.bedCharges.icu.total || 0}</td>
        </tr>
        <tr>
            <td>Single AC Bed Charges</td>
            <td>${billDetails.bedCharges.singleAc.ratePerDay || 0}</td>
            <td>${billDetails.bedCharges.singleAc.quantity || 0}</td>
            <td>${billDetails.bedCharges.singleAc.date || "N/A"}</td>
            <td>${billDetails.bedCharges.singleAc.total || 0}</td>
        </tr>
        <tr>
            <td>General Ward Charges</td>
            <td>${billDetails.bedCharges.generalWard?.ratePerDay || 0}</td>
            <td>${billDetails.bedCharges.generalWard?.quantity || 0}</td>
            <td>${billDetails.bedCharges.generalWard?.date || "N/A"}</td>
            <td>${billDetails.bedCharges.generalWard?.total || 0}</td>
        </tr>
        <tr>
            <td colspan="4"><strong>Total Bed Charges</strong></td>
            <td><strong>${billDetails.bedCharges.total || 0}</strong></td>
        </tr>
        <tr><th colspan="5">Procedure Charges Breakdown</th></tr>
        <tr>
            <td>Oxygen Procedure Charges</td>
            <td>${billDetails.procedureCharges.oxygen?.ratePerUnit || 0}</td>
            <td>${billDetails.procedureCharges.oxygen?.quantity || 0}</td>
            <td>${billDetails.procedureCharges.oxygen?.date || "N/A"}</td>
            <td>${billDetails.procedureCharges.oxygen?.total || 0}</td>
        </tr>
        <tr>
            <td colspan="4"><strong>Total Procedure Charges</strong></td>
            <td><strong>${billDetails.procedureCharges.total || 0}</strong></td>
        </tr>
        <tr><th colspan="5">Doctor Charges Breakdown</th></tr>
        <tr>
            <td>ICU Doctor Visits</td>
            <td>${billDetails.doctorCharges.icuVisiting?.ratePerVisit || 0}</td>
            <td>${billDetails.doctorCharges.icuVisiting?.visits || 0}</td>
            <td>${billDetails.doctorCharges.icuVisiting?.date || "N/A"}</td>
            <td>${billDetails.doctorCharges.icuVisiting?.total || 0}</td>
        </tr>
        <tr>
            <td>General Doctor Visits</td>
            <td>${billDetails.doctorCharges.generalVisiting?.rate || 0}</td>
            <td>${billDetails.doctorCharges.generalVisiting?.quantity || 0}</td>
            <td>${billDetails.doctorCharges.generalVisiting?.date || "N/A"}</td>
            <td>${billDetails.doctorCharges.generalVisiting?.total || 0}</td>
        </tr>
        <tr>
            <td colspan="4"><strong>Total Doctor Charges</strong></td>
            <td><strong>${billDetails.doctorCharges.total || 0}</strong></td>
        </tr>
        <tr><th colspan="5">Investigation Charges Breakdown</th></tr>
        <tr>
            <td>ECG Charges</td>
            <td>${billDetails.investigationCharges.ecg.ratePerTest || 0}</td>
            <td>${billDetails.investigationCharges.ecg.quantity || "N/A"}</td>
            <td>${billDetails.investigationCharges.ecg.date || "N/A"}</td>
            <td>${billDetails.investigationCharges.ecg.total || 0}</td>
        </tr>
        <tr>
            <td>X-ray Charges</td>
            <td>${billDetails.investigationCharges.xray.ratePerTest || 0}</td>
            <td>${billDetails.investigationCharges.xray.quantity || "N/A"}</td>
            <td>${billDetails.investigationCharges.xray.date || "N/A"}</td>
            <td>${billDetails.investigationCharges.xray.total || 0}</td>
        </tr>
        <tr>
            <td colspan="4"><strong>Total Investigation Charges</strong></td>
            <td><strong>${
              billDetails.investigationCharges.total || 0
            }</strong></td>
        </tr>
        <tr>
            <td><strong>Medicine Charges</strong></td>
            <td colspan="3"></td>
            <td><strong>${billDetails.medicineCharges.total || 0}</strong></td>
        </tr>
        <tr>
            <td colspan="4"><strong>Overall Total Amount</strong></td>
            <td><strong>${billDetails.totalAmountDue || 0}</strong></td>
        </tr>
    </table>
</body>
</html>

  `;
    // pdf.create(billHTML, { format: "A4" }).toBuffer(async (err, pdfBuffer) => {
    //   if (err) {
    //     return res.status(500).json({
    //       message: "Failed to generate PDF",
    //       error: err.message,
    //     });
    //   }
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(billHTML);
    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();

    // Authenticate with Google Drive API
    const auth = new google.auth.GoogleAuth({
      credentials: ServiceAccount,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    const drive = google.drive({ version: "v3", auth });

    // Convert PDF buffer into a readable stream
    const bufferStream = new Readable();
    bufferStream.push(pdfBuffer);
    bufferStream.push(null);

    // Folder ID in Google Drive
    const folderId = "1Trbtp9gwGwNF_3KNjNcfL0DHeSUp0HyV";

    // Upload PDF to Google Drive
    const driveFile = await drive.files.create({
      resource: {
        name: `Bill_${patientId}.pdf`,
        parents: [folderId],
      },
      media: {
        mimeType: "application/pdf",
        body: bufferStream,
      },
      fields: "id, webViewLink",
    });

    // Extract file's public link
    const fileLink = driveFile.data.webViewLink;

    return res.status(200).json({
      message: "Bill generated successfully.",
      billDetails: billDetails,
      fileLink: fileLink,
    });
    // });
  } catch (error) {
    console.error("Error generating bill:", error);
    return res.status(500).json({ error: error });
  }
};
export const generateFeeReceipt = (req, res) => {};

export const listAllPatientsWithLastRecord = async (req, res) => {
  try {
    const patientsHistory = await PatientHistory.aggregate([
      // Filter to only include records where dischargedByReception is false
      {
        $addFields: {
          history: {
            $filter: {
              input: "$history",
              as: "record",
              cond: { $eq: ["$$record.dischargedByReception", false] },
            },
          },
        },
      },
      // Sort the history array by admissionDate in descending order
      {
        $addFields: {
          history: {
            $sortArray: {
              input: "$history",
              sortBy: { admissionDate: -1 }, // Sort descending by admissionDate
            },
          },
        },
      },
      // Unwind the history array
      {
        $unwind: "$history",
      },
      // Group by patientId to get the last record after sorting
      {
        $group: {
          _id: "$patientId", // Group by patientId
          name: { $first: "$name" }, // Get the first name value (consistent for each patientId)
          gender: { $first: "$gender" }, // Get the first gender value
          contact: { $first: "$contact" }, // Get the first contact value
          lastRecord: { $first: "$history" }, // First record from the sorted array (latest record)
        },
      },
      // Project the output fields
      {
        $project: {
          _id: 0, // Exclude _id
          patientId: "$_id", // Include patientId
          name: 1,
          gender: 1,
          contact: 1,
          lastRecord: 1,
        },
      },
    ]);

    // Check if any patients are found
    if (patientsHistory.length === 0) {
      return res
        .status(404)
        .json({ error: "No patients found or no history available." });
    }

    // Format the dates in the last record
    patientsHistory.forEach((patient) => {
      const lastRecord = patient.lastRecord;
      if (lastRecord) {
        lastRecord.admissionDate = lastRecord.admissionDate
          ? dayjs(lastRecord.admissionDate)
              .tz("Asia/Kolkata")
              .format("YYYY-MM-DD hh:mm:ss A")
          : null;
        lastRecord.dischargeDate = lastRecord.dischargeDate
          ? dayjs(lastRecord.dischargeDate)
              .tz("Asia/Kolkata")
              .format("YYYY-MM-DD hh:mm:ss A")
          : null;
      }
    });

    return res.status(200).json(patientsHistory);
  } catch (error) {
    console.error("Error fetching patients' history:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// export const getDoctorAdvice = async (req, res) => {
//   const { patientId } = req.params;

//   try {
//     // Find the patient history by patientId
//     const patientHistory = await PatientHistory.findOne({ patientId });

//     if (!patientHistory) {
//       return res.status(404).json({ message: "Patient history not found." });
//     }

//     // Get the latest record from the history array
//     const latestRecord =
//       patientHistory.history[patientHistory.history.length - 1];

//     if (!latestRecord) {
//       return res
//         .status(404)
//         .json({ message: "No records found for the patient." });
//     }

//     // Find the patient details from the patient schema
//     const patient = await patientSchema.findOne({ patientId });

//     if (!patient) {
//       return res.status(404).json({ message: "Patient not found." });
//     }

//     // Extract the required details
//     const response = {
//       name: patient.name,
//       weight: latestRecord.weight,
//       age: patient.age,
//       symptoms: latestRecord.symptomsByDoctor,
//       vitals: latestRecord.vitals,
//       diagnosis: latestRecord.diagnosisByDoctor,
//       prescriptions: latestRecord.doctorPrescriptions,
//     };

//     res.status(200).json(response);
//   } catch (error) {
//     console.error("Error retrieving doctor advice:", error);
//     res.status(500).json({
//       message: "Failed to retrieve doctor advice.",
//       error: error.message,
//     });
//   }
// };

export const getDoctorAdvice = async (req, res) => {
  const { patientId } = req.params;

  try {
    // Find the patient history by patientId
    const patientHistory = await PatientHistory.findOne({ patientId });

    if (!patientHistory) {
      return res.status(404).json({ message: "Patient history not found." });
    }

    // Get the latest record from the history array
    const latestRecord =
      patientHistory.history[patientHistory.history.length - 1];

    if (!latestRecord) {
      return res
        .status(404)
        .json({ message: "No records found for the patient." });
    }

    // Find the patient details from the patient schema
    const patient = await patientSchema.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }
    // Extract the required details
    const response = {
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      contact: patient.contact,
      admissionDate: latestRecord.admissionDate,
      doctor: latestRecord.doctor.name,
      weight: latestRecord.weight,
      age: patient.age,
      symptoms: latestRecord.symptomsByDoctor,
      vitals: latestRecord.vitals,
      diagnosis: latestRecord.diagnosisByDoctor,
      prescriptions: latestRecord.doctorPrescriptions,
    };
    response.prescriptions.forEach((prescription) => {
      console.log(prescription.medicine);
    });
    // Generate HTML content for the PDF
    const doctorAdviceHtml = `
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prescription</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #fff;
            margin: 20px;
        }

        .container {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #000;
            padding: 20px;
            box-sizing: border-box;
        }

        .header img {
            width: 100%;
            height: auto;
        }

        .details {
            margin-bottom: 20px;
        }

        .details-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }

        .details-row p {
            flex: 1;
            margin: 5px 0;
            font-size: 14px;
        }

        .details-row p:not(:last-child) {
            margin-right: 20px;
        }

        .section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
        }

        .left, .right {
            width: 48%;
        }

        h2 {
            font-size: 16px;
            margin: 10px 0;
            border-bottom: 1px solid #000;
            padding-bottom: 5px;
        }

        ul {
            list-style-type: none;
            padding: 0;
        }

        li {
            margin: 5px 0;
            font-size: 14px;
        }

        .prescription-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        .prescription-table th, .prescription-table td {
            border: 1px solid #000;
            padding: 8px;
            text-align: left;
            font-size: 14px;
        }

        .prescription-table th {
            background-color: #f2f2f2;
        }

        .footer {
            text-align: center;
            font-size: 14px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="./saideepheader.png" alt="header">
        </div>
        <div class="details">
            <div class="details-row">
                <p><strong>Name:</strong> ${response.name}</p>
                <p><strong>Age:</strong> ${response.age}</p>
                <p><strong>Gender:</strong> ${response.gender}</p>
            </div>
            <div class="details-row">
                <p><strong>Contact:</strong> ${response.contact}</p>
                <p><strong>Date:</strong> ${new Date(
                  response.admissionDate
                ).toLocaleDateString()}</p>
                <p><strong>Doctor:</strong> ${response.doctor}</p>
            </div>
            <div class="details-row">
                <p><strong>Weight:</strong> ${response.weight} kg</p>
                <p><strong>Height:</strong> ${response.height} cm</p>
                <p><strong>BMI:</strong> ${response.bmi} kg/m²</p>
            </div>
        </div>
        <div class="section">
            <div class="left">
                <h2>Vitals</h2>
                <ul>
                    ${response.vitals
                      .map(
                        (vital) => `
                        <li>Temperature: ${vital.temperature} °C</li>
                        <li>Pulse: ${vital.pulse} bpm</li>
                        <li>Other: ${vital.other}</li>
                        <li>Recorded At: ${new Date(
                          vital.recordedAt
                        ).toLocaleString()}</li>
                    `
                      )
                      .join("")}
                </ul>
                <h2>Symptoms</h2>
                <ul>
                    ${response.symptoms
                      .map((symptom) => `<li>${symptom}</li>`)
                      .join("")}
                </ul>
                <h2>Diagnosis</h2>
                <ul>
                    ${response.diagnosis
                      .map((diagnosis) => `<li>${diagnosis}</li>`)
                      .join("")}
                </ul>
            </div>
            <div class="right">
                <h2>Prescriptions</h2>
                <table class="prescription-table">
                    <thead>
                        <tr>
                            <th>Medicine</th>
                            <th>Dosage</th>
                            <th>Duration</th>
                            <th>Comments</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${response.prescriptions
                          .map(
                            (prescription) => `
                            <tr>
                                <td>${prescription.medicine.name}</td>
                                <td>${prescription.dosage}</td>
                                <td>${prescription.duration}</td>
                                <td>${prescription.frequency}</td>
                            </tr>
                        `
                          )
                          .join("")}
                    </tbody>
                </table>
            </div>
        </div>
        <div class="footer">
            <p>Dr. Santosh Raste</p>
        </div>
    </div>
</body>
</html>
    `;

    // Generate PDF from HTML
    pdf
      .create(doctorAdviceHtml, { format: "A4" })
      .toBuffer(async (err, pdfBuffer) => {
        if (err) {
          return res.status(500).json({
            message: "Failed to generate PDF",
            error: err.message,
          });
        }
        // Authenticate with Google Drive API
        const auth = new google.auth.GoogleAuth({
          credentials: ServiceAccount,
          scopes: ["https://www.googleapis.com/auth/drive"],
        });
        const drive = google.drive({ version: "v3", auth });

        // Convert PDF buffer into a readable stream
        const bufferStream = new Readable();
        bufferStream.push(pdfBuffer);
        bufferStream.push(null);

        // Folder ID in Google Drive
        const folderId = "1Trbtp9gwGwNF_3KNjNcfL0DHeSUp0HyV";

        // Upload PDF to Google Drive
        const driveFile = await drive.files.create({
          resource: {
            name: `DoctorAdvice_${patientId}.pdf`,
            parents: [folderId],
          },
          media: {
            mimeType: "application/pdf",
            body: bufferStream,
          },
          fields: "id, webViewLink",
        });

        // Extract file's public link
        const fileLink = driveFile.data.webViewLink;

        return res.status(200).json({
          message: "Doctor advice generated successfully.",
          fileLink: fileLink,
        });
      });
  } catch (error) {
    console.error("Error retrieving doctor advice:", error);
    res.status(500).json({
      message: "Failed to retrieve doctor advice.",
      error: error.message,
    });
  }
};
export const generateFinalReceipt = async (req, res) => {
  try {
    const { patientId, amountPaid = 0, billingAmount = 0 } = req.params;

    if (!patientId) {
      return res.status(400).json({ error: "Patient ID is required." });
    }

    // Find the patient record
    const patient = await patientSchema.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({ error: "Patient not found." });
    }

    // Fetch the patient's most recent admission history
    const patientHistory = await PatientHistory.findOne({ patientId });

    if (!patientHistory || patientHistory.history.length === 0) {
      return res.status(404).json({ error: "Patient history not found." });
    }

    // Get the last record (most recent admission)
    const lastRecord =
      patientHistory.history[patientHistory.history.length - 1];
    const { amountToBePayed } = lastRecord;

    // Start with the pending amount from the patient schema and last admission record
    let totalAmountDue =
      (patient.pendingAmount || 0) + (amountToBePayed || 0) + billingAmount;

    // Calculate the remaining balance after payment
    const remainingBalance = totalAmountDue - amountPaid;

    // Update the pending amount in the patient schema
    patient.pendingAmount = Math.max(remainingBalance, 0); // Ensure no negative pending balance
    patient.discharged = remainingBalance <= 0; // Mark as fully discharged if no pending amount

    // Save the updated patient record
    await patient.save();
    const now = new Date();

    const data = {
      date: now.toISOString().split("T")[0], // Extracts the date in YYYY-MM-DD format
      time: now.toTimeString().split(" ")[0], // Extracts the time in HH:MM:SS format
    };
    // Prepare the final bill details
    const billDetails = {
      patientId: patientId,
      name: patient.name,
      gender: patient.gender,
      contact: patient.contact,
      weight: lastRecord.weight,
      amountToBePayed: totalAmountDue,
      amountPaid: amountPaid,
      billingAmount: billingAmount,
      date: data.date,
      time: data.time,

      remainingBalance: remainingBalance,
      dischargeStatus: patient.discharged
        ? "Fully Discharged"
        : "Pending Balance",
    };

    const billHTML = `
    
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Patient Bill Receipt</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f4f4f9;
    }
    .container {
      max-width: 600px;
      margin: 30px auto;
      background: #fff;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    h1, h2 {
      text-align: center;
      color: #333;
      margin: 0 0 20px 0;
    }
    .details {
      margin: 20px 0;
      line-height: 1.6;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
    }
    .details p {
      flex: 1 1 30%;
      margin: 5px 0;
    }
    .details strong {
      font-weight: bold;
    }
    .total {
      margin: 20px 0;
      padding: 15px;
      text-align: center;
      background: #f9f9f9;
      font-size: 18px;
      font-weight: bold;
      border-radius: 4px;
    }
    .discharge-status {
      text-align: center;
      font-size: 16px;
      margin-top: 10px;
      color: #4caf50;
    }
    .discharge-status.pending {
      color: #ff5722;
    }
    footer {
      text-align: center;
      margin-top: 20px;
      font-size: 16px;
      font-weight: bold;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Saideep Hospital</h1>
    <h2>Payment Receipt</h2>
    <div class="details">
      <p><strong>Patient ID:</strong> ${billDetails.patientId}</p>
      <p><strong>Name:</strong> ${billDetails.name}</p>
      <p><strong>Gender:</strong> ${billDetails.gender}</p>
      <p><strong>Contact:</strong> ${billDetails.contact}</p>
      <p><strong>Weight:</strong> ${billDetails.weight} kg</p>
      <p><strong>Date:</strong> ${billDetails.date}</p>
      <p><strong>Time:</strong> ${billDetails.time}</p>
      <p><strong>Billing Amount:</strong> ${billDetails.billingAmount}</p>
      <p><strong>Amount Due:</strong> ₹${billDetails.amountToBePayed}</p>
      <p><strong>Remaining Balance:</strong> ₹${
        billDetails.remainingBalance
      }</p>
    </div>
    <div class="total">
      Amount Paid: ₹${billDetails.amountPaid}
    </div>
    <div class="discharge-status ${
      billDetails.dischargeStatus === "Pending Balance" ? "pending" : ""
    }">
      ${billDetails.dischargeStatus}
    </div>
    <footer>
      Thank you for choosing our hospital. Please retain this receipt for future reference.
    </footer>
  </div>
</body>
</html>
`;
    pdf.create(billHTML, { format: "A4" }).toBuffer(async (err, pdfBuffer) => {
      if (err) {
        return res.status(500).json({
          message: "Failed to generate PDF",
          error: err.message,
        });
      }

      // Authenticate with Google Drive API
      const auth = new google.auth.GoogleAuth({
        credentials: ServiceAccount,
        scopes: ["https://www.googleapis.com/auth/drive"],
      });
      const drive = google.drive({ version: "v3", auth });

      // Convert PDF buffer into a readable stream
      const bufferStream = new Readable();
      bufferStream.push(pdfBuffer);
      bufferStream.push(null);

      // Folder ID in Google Drive
      const folderId = "1Trbtp9gwGwNF_3KNjNcfL0DHeSUp0HyV";

      // Upload PDF to Google Drive
      const driveFile = await drive.files.create({
        resource: {
          name: `Bill_${patientId}.pdf`,
          parents: [folderId],
        },
        media: {
          mimeType: "application/pdf",
          body: bufferStream,
        },
        fields: "id, webViewLink",
      });

      // Extract file's public link
      const fileLink = driveFile.data.webViewLink;
      // await browser.close();
      return res.status(200).json({
        message: "Bill generated successfully.",
        billDetails: billDetails,
        fileLink: fileLink,
      });
    });
  } catch (error) {
    console.error("Error generating bill:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const getDoctorAdvic1 = async (req, res) => {
  const { patientId, admissionId } = req.params; // Include admissionId from request params

  try {
    // Find the patient details from the patient schema
    const patient = await patientSchema.findOne({ patientId });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found." });
    }

    // Find the admission record using the admissionId
    const admissionRecord = patient.admissionRecords.find(
      (record) => record._id.toString() === admissionId
    );

    if (!admissionRecord) {
      return res.status(404).json({ message: "Admission record not found." });
    }

    // Format the response
    const response = {
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      contact: patient.contact,
      address: patient.address,
      admissionDate: admissionRecord.admissionDate,
      dischargeDate: admissionRecord.dischargeDate || null,
      doctor: admissionRecord.doctor ? admissionRecord.doctor.name : null,
      weight: admissionRecord.weight || null,
      symptoms: admissionRecord.symptomsByDoctor || [],
      vitals: admissionRecord.vitals || [],
      diagnosis: admissionRecord.diagnosisByDoctor || [],
      prescriptions: admissionRecord.doctorPrescriptions || [],
    };

    // Generate HTML content for the PDF
    const doctorAdviceHtml = `
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prescription</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #fff;
            margin: 20px;
        }
        
        .container {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            border: 1px solid #000;
            padding: 20px;
            box-sizing: border-box;
        }
        
        .header img {
            width: 100%;
            height: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        th, td {
            border: 1px solid #000;
            padding: 4px;  /* Reduced padding for compact height */
            text-align: left;
            font-size: 14px;
        }

        th {
            background-color: #f2f2f2;
        }

        .details-table td {
            border: none;
        }

        .footer {
            text-align: center;
            font-size: 14px;
            margin-top: 20px;
        }

    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://res.cloudinary.com/dnznafp2a/image/upload/v1736544247/cb6bdlgforsw3al3tz5l.png" alt="header">
        </div>
        <table class="details-table">
            <tr>
                <td><strong>Name:</strong> ${response.name}</td>
                <td><strong>Age:</strong> ${response.age}</td>
                <td><strong>Gender:</strong> ${response.gender}</td>
                <td><strong>Contact:</strong> ${response.contact}</td>
            </tr>
            <tr>
                <td><strong>Date:</strong> ${new Date(
                  response.admissionDate
                ).toLocaleDateString()}</td>
                <td><strong>Doctor:</strong> ${response.doctor}</td>
                <td><strong>Weight:</strong> ${response.weight} kg</td>
                <td><strong>Height:</strong> ${response.height} cm</td>
            </tr>
            <tr>
                <td><strong>BMI:</strong> ${response.bmi} kg/m²</td>
                <td colspan="3"></td>
            </tr>
        </table>
        <table>
            <thead>
                <tr>
                    <th>Section</th>
                    <th>Details</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Vitals</td>
                    <td>
                        <table>
                            <thead>
                                <tr>
                                    <th>Temperature</th>
                                    <th>Pulse</th>
                                    <th>Other</th>
                                    <th>Recorded At</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${response.vitals
                                  .map(
                                    (vital) => `
                                <tr>
                                    <td>${vital.temperature} °C</td>
                                    <td>${vital.pulse} bpm</td>
                                    <td>${vital.other}</td>
                                    <td>${new Date(
                                      vital.recordedAt
                                    ).toLocaleString()}</td>
                                </tr>
                                `
                                  )
                                  .join("")}
                            </tbody>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td>Symptoms</td>
                    <td>
                        <table>
                            <tbody>
                                ${response.symptoms
                                  .map(
                                    (symptom) => `<tr><td>${symptom}</td></tr>`
                                  )
                                  .join("")}
                            </tbody>
                        </table>
                    </td>
                </tr>
                <tr>
                    <td>Diagnosis</td>
                    <td>
                        <table>
                            <tbody>
                                ${response.diagnosis
                                  .map(
                                    (diagnosis) =>
                                      `<tr><td>${diagnosis}</td></tr>`
                                  )
                                  .join("")}
                            </tbody>
                        </table>
                    </td>
                </tr>
            </tbody>
        </table>
        <h2>Prescriptions</h2>
        <table class="prescription-table">
            <thead>
                <tr>
                    <th>Medicine</th>
                    <th>Dosage</th>
                    <th>Comments</th>
                </tr>
            </thead>
            <tbody>
                ${response.prescriptions
                  .map(
                    (prescription) => `
                <tr>
                    <td>${prescription.medicine.name}</td>
                    <td>M: ${prescription.medicine.morning} / A: ${prescription.medicine.afternoon} / N: ${prescription.medicine.night}</td>
                    <td>${prescription.frequency}</td>
                </tr>
                `
                  )
                  .join("")}
            </tbody>
        </table>
        <div class="footer">
            <p>Dr. Santosh Raste</p>
        </div>
    </div>
</body>
</html>
    `;
    const browser = await puppeteer.launch({
      args: [
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--single-process",
        "--no-zygote",
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    });
    console.log("check thei path", process.env.PUPPETEER_EXECUTABLE_PATH);
    const page = await browser.newPage();
    await page.setContent(doctorAdviceHtml);
    const pdfBuffer = await page.pdf({ format: "A4" });
    await browser.close();
    // Generate PDF from HTML
    // pdf
    //   .create(doctorAdviceHtml, { format: "A4" })
    //   .toBuffer(async (err, pdfBuffer) => {
    //     if (err) {
    //       return res.status(500).json({
    //         message: "Failed to generate PDF",
    //         error: err.message,
    //       });
    //     }

    // Authenticate with Google Drive API
    const auth = new google.auth.GoogleAuth({
      credentials: ServiceAccount,
      // keyFile: "./apikey.json", // Path to your Google service account key file
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    const drive = google.drive({ version: "v3", auth });

    // Convert PDF buffer into a readable stream
    const bufferStream = new Readable();
    bufferStream.push(pdfBuffer);
    bufferStream.push(null);

    // Folder ID in Google Drive
    const folderId = "1Trbtp9gwGwNF_3KNjNcfL0DHeSUp0HyV";

    // Upload PDF to Google Drive
    try {
      const driveFile = await drive.files.create({
        resource: {
          name: `DoctorAdvice_${patientId}.pdf`,
          parents: [folderId],
        },
        media: {
          mimeType: "application/pdf",
          body: bufferStream,
        },
        fields: "id, webViewLink",
      });

      // Extract file's public link
      const fileLink = driveFile.data.webViewLink;

      return res.status(200).json({
        message: "Doctor advice generated successfully.",
        fileLink: fileLink,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Failed to upload PDF to Google Drive",
        error: error.message,
      });
    }
    // });
  } catch (error) {
    console.error("Error generating doctor advice:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};
export const getDoctorSheet = async (req, res) => {
  try {
    const { patientId } = req.params; // Extract patientId from the request parameters

    // Find the patient in the PatientHistory collection
    const patientHistory = await PatientHistory.findOne({ patientId });
    if (!patientHistory) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Get the latest admission record from the history array
    const lastAdmission = patientHistory.history.at(-1); // Fetch the last record
    if (!lastAdmission) {
      return res
        .status(404)
        .json({ message: "No admission records found for the patient" });
    }

    // Get the latest consulting record from the doctorConsulting array in the latest admission
    const lastConsulting = lastAdmission.doctorConsulting.at(-1); // Fetch the last consulting record
    if (!lastConsulting) {
      return res.status(404).json({
        message: "No consulting records found for the latest admission",
      });
    }
    // Format the response
    const response = {
      patientId: patientHistory.patientId,
      name: patientHistory.name,
      age: patientHistory.age,
      gender: patientHistory.gender,
      contact: patientHistory.contact || null,
      address: patientHistory.address || null,
      admissionDate: lastAdmission.admissionDate,
      dischargeDate: lastAdmission.dischargeDate || null,
      doctor: lastAdmission.doctor?.name || null,
      allergies: lastConsulting.allergies || null,
      cheifComplaint: lastConsulting.cheifComplaint || null,
      describeAllergies: lastConsulting.describeAllergies || null,
      historyOfPresentIllness: lastConsulting.historyOfPresentIllness || null,
      personalHabits: lastConsulting.personalHabits || null,
      familyHistory: lastConsulting.familyHistory || null,
      menstrualHistory: lastConsulting.menstrualHistory || null,
      wongBaker: lastConsulting.wongBaker || null,
      visualAnalogue: lastConsulting.visualAnalogue || null,
      relevantPreviousInvestigations:
        lastConsulting.relevantPreviousInvestigations || null,
      immunizationHistory: lastConsulting.immunizationHistory || null,
      pastMedicalHistory: lastConsulting.pastMedicalHistory || null,
    };
    const DoctorHTML = `
    <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Doctor Initial Assessment Sheet</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin-top: 0;
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: #f4f4f4;
            flex-direction: column;
        }
        .container {
            width: 210mm;
            height: auto;
            padding: 15mm;
            padding-top: 0;
            box-sizing: border-box;
            border: 1px solid #000;
            background-color: #fff;
            margin-bottom: 2mm;
        }
        .header {
            text-align: center;
            margin-bottom: 5px;
        }
        .header h1 {
            margin: 5px 0;
            font-size: 24px;
        }
        .header p {
            margin: 5px 0;
            font-size: 14px;
        }
        .section {
            margin-bottom: 20px;
        }
        .section h3 {
            font-size: 16px;
            margin-bottom: 10px;
            border-bottom: 1px solid #000;
            padding-bottom: 5px;
        }
        .field-table {
            width: 100%;
            margin-bottom: 20px;
        }
        .field-table td {
            padding: 5px 10px;
            vertical-align: top;
        }
        .checkbox-group {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        .checkbox-group input {
            margin-right: 10px;
        }
        .textarea {
            width: 100%;
            height: 100px;
            box-sizing: border-box;
            border: 1px solid #000;
            padding: 5px;
            margin-bottom: 20px;
        }
        .pain-scale img {
            width: 100%;
            max-width: 600px;
        }
        .header img {
            padding-top: 10px;
        }
        .pain-scale {
            width: 100%;
        }
        .pain-scale .scale {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        .pain-scale .scale span {
            font-weight: bold;
            margin-right: 10px;
        }
        .pain-scale .progress-bar {
            flex-grow: 1;
            height: 20px;
            background-color: #ddd;
            border-radius: 5px;
            position: relative;
        }
        .pain-scale .progress-bar::after {
            content: "";
            position: absolute;
            height: 100%;
            background-color: #f00;
            border-radius: 5px;
            transition: width 0.3s ease;
        }
        .pain-scale .wong-baker {
            width: 100%;
        }
        .pain-scale .visual-analogue {
            width: 100%;
        }
    </style>
</head>
<body>
    <div class="container" id="page-1">
        <div class="header">
            <img src="https://res.cloudinary.com/dnznafp2a/image/upload/v1736544247/cb6bdlgforsw3al3tz5l.png" alt="header">
            <h3>DOCTOR INITIAL ASSESSMENT SHEET</h3>
        </div>
        <div class="section">
            <table class="field-table">
                <tr>
                    <td><strong>Patient id.:</strong> <span id="patientid">${
                      response.patientId
                    }</span></td>
                    <td><strong>Patient Name:</strong> <span id="patientName">${
                      response.name
                    }</span></td>
                </tr>
                <tr>
                    <td><strong>Age:</strong> <span id="age">${
                      response.age
                    }</span></td>
                    <td><strong>Sex:</strong> <span id="sex">${
                      response.gender
                    }</span></td>
                    <td><strong>Date:</strong> <span id="date">${
                      response.admissionDate
                    }</span></td>
                </tr>
                <tr>
                    <td colspan="3"><strong>Name of Consultant:</strong> <span id="consultant">${
                      response.doctor || "N/A"
                    }</span></td>
                </tr>
            </table>
        </div>

        <div class="section">
            <h3>Known Allergies</h3>
            <div class="checkbox-group">
                <strong>Allergies:</strong><span id="allergies">${
                  response.allergies || "N/A"
                }</span>
            </div>
            <div class="field">
                <span>Describe:</span> <div id="describe" class="textarea">${
                  response.describeAllergies || "N/A"
                }</div>
            </div>
        </div>

        <div class="section">
            <h3>Chief Complaint</h3>
            <div id="chiefComplaint" class="textarea">${
              response.cheifComplaint || "N/A"
            }</div>
        </div>

        <div class="section">
            <h3>History of Present Illness</h3>
            <div id="historyIllness" class="textarea">${
              response.historyOfPresentIllness || "N/A"
            }</div>
        </div>

        <div class="section">
            <h3>Personal Habits:</h3>
            <div class="checkbox-group">
                <span id="personalHabits">${
                  response.personalHabits || "N/A"
                }</span>
            </div>
        </div>

        <div class="section">
            <h3>Immunization History (if relevant):</h3>
            <div id="immunization" class="textarea">${
              response.immunizationHistory || "N/A"
            }</div>
        </div><br><br>
        <div class="section">
            <h3>Past History</h3>
            <div id="pastHistory" class="textarea">${
              response.pastMedicalHistory || "N/A"
            }</div>
        </div>

        <div class="section">
            <h3>Family History</h3>
            <div id="familyHistory" class="textarea">${
              response.menstrualHistory || "N/A"
            }</div>
        </div>
        <div class="section">
            <h3>Relevant Previous Investigations Report</h3>
            <div id="previousInvestigations" class="textarea">${
              response.relevantPreviousInvestigations || "N/A"
            }</div>
        </div>

        <div class="section">
            <h3>Menstrual History</h3><br>
            <span id="menstrualHistory">${
              response.menstrualHistory || "N/A"
            }</span>
        </div>

        <div class="section pain-scale"> 
            <h3>Pain Scale</h3> 
            <div class="scale wong-baker">  
                <strong>Wong-Baker:</strong><span id="wongBaker" >${
                  response.wongBaker || "N/A"
                }</span> 
            </div> 
        </div> 
        <div class="scale visual-analogue"> 
            <strong>0-10 Visual Analogue:</strong><span id="visualAnalogue">${
              response.visualAnalogue || "N/A"
            }</span>     
                </div> 
            </div> 
        </div> 
    </div>
</div>
</body>
</html>
    `;
    pdf
      .create(DoctorHTML, { format: "A4" })
      .toBuffer(async (err, pdfBuffer) => {
        if (err) {
          return res.status(500).json({
            message: "Failed to generate PDF",
            error: err.message,
          });
        }

        // Authenticate with Google Drive API
        const auth = new google.auth.GoogleAuth({
          credentials: ServiceAccount,
          scopes: ["https://www.googleapis.com/auth/drive"],
        });
        const drive = google.drive({ version: "v3", auth });

        // Convert PDF buffer into a readable stream
        const bufferStream = new Readable();
        bufferStream.push(pdfBuffer);
        bufferStream.push(null);

        // Folder ID in Google Drive
        const folderId = "1Trbtp9gwGwNF_3KNjNcfL0DHeSUp0HyV";

        // Upload PDF to Google Drive
        const driveFile = await drive.files.create({
          resource: {
            name: `Bill_${patientId}.pdf`,
            parents: [folderId],
          },
          media: {
            mimeType: "application/pdf",
            body: bufferStream,
          },
          fields: "id, webViewLink",
        });

        // Extract file's public link
        const fileLink = driveFile.data.webViewLink;
        // await browser.close();

        return res.status(200).json({
          message: "Bill generated successfully.",
          response: response,
          fileLink: fileLink,
        });
      });
  } catch (err) {
    console.error("Error fetching doctor consulting:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const dischargeByReception = async (req, res) => {
  const { patientId, admissionId } = req.params;

  try {
    // Find the patient history document by patientId
    const patientHistory = await PatientHistory.findOne({ patientId });

    if (!patientHistory) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Find the specific admission record within the history array
    const admission = patientHistory.history.find(
      (record) => record.admissionId.toString() === admissionId
    );

    if (!admission) {
      return res.status(404).json({ message: "Admission record not found" });
    }

    // Update dischargedByReception to true
    admission.dischargedByReception = true;

    // Save the updated patient history document
    await patientHistory.save();

    return res.status(200).json({
      message: "Discharged by reception updated successfully",
      patientHistory,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const generateDeclaration = async (req, res) => {
  const fileLink = "helllox";
  try {
    return res.status(200).json({
      message: "Bill generated successfully.",
      fileLink: fileLink,
    });
  } catch (error) {
    console.error("Error fetching doctor consulting:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getLastRecordWithFollowUps = async (req, res) => {
  const { patientId } = req.params;

  try {
    // Find the patient history by patientId
    const patientHistory = await PatientHistory.findOne({ patientId });

    if (!patientHistory) {
      return res.status(404).json({ message: "Patient history not found." });
    }

    // Get the last record from the history array
    const lastRecord =
      patientHistory.history[patientHistory.history.length - 1];

    if (!lastRecord) {
      return res
        .status(404)
        .json({ message: "No records found for the patient." });
    }

    // Return the last record and its follow-ups
    res.status(200).json({
      message: "Last record with follow-ups fetched successfully",
      lastRecord,
      followUps: lastRecord.followUps,
    });
  } catch (error) {
    console.error("Error fetching last record with follow-ups:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
