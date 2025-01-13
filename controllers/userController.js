import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Doctor from "../models/doctorSchema.js";
import hospitalDoctors from "../models/hospitalDoctorSchema.js";
import NonPatient from "../models/nonPatientSchema.js";
import Nurse from "../models/nurseSchema.js";
import twilio from "twilio";
import { fileURLToPath } from "url"; // To handle __dirname in ESM
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import cloudinary from "../helpers/cloudinary.js";
import LabReport from "../models/labreportSchema.js";
import { Readable } from "stream";
const SECRET = "DOCTOR";

export const signupDoctor = async (req, res) => {
  try {
    const {
      email,
      password,
      usertype,
      doctorName,
      speciality,
      experience,
      department,
      phoneNumber,
    } = req.body;
    const file = req.file;
    console.log("Uploaded file details:", file);

    const existingUser = await hospitalDoctors.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }
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

    // Hash the password and create the user
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await hospitalDoctors.create({
      email,
      password: hashedPassword,
      usertype,
      doctorName,
      speciality,
      experience,
      department,
      phoneNumber,
      imageUrl,
      // Add this field for FCM token
      // Link to doctor by name
    });

    // Generate JWT token
    const token = jwt.sign(
      { email: result.email, id: result._id, usertype: result.usertype },
      SECRET,
      { expiresIn: "30d" }
    );

    res.status(201).json({ user: result, token });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Signup failed.", error: error.message });
  }
};

export const signinDoctor = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const existingUser = await hospitalDoctors.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if password is correct
    const matchPassword = await bcrypt.compare(password, existingUser.password);
    if (!matchPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        email: existingUser.email,
        id: existingUser._id,
        usertype: existingUser.usertype,
      },
      SECRET,
      { expiresIn: "30d" }
    );

    res.status(200).json({ user: existingUser, token });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ message: "Signin failed", error: error.message });
  }
};
export const signupNurse = async (req, res) => {
  const { email, password, usertype, nurseName } = req.body;

  try {
    // Check if a user with the provided email already exists
    const existingUser = await Nurse.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    // Hash the password and create the user
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await Nurse.create({
      email,
      password: hashedPassword,
      usertype, // Add usertype field if needed
      nurseName,
    });

    // Generate JWT token
    const token = jwt.sign(
      { email: result.email, id: result._id, usertype: result.usertype },
      SECRET,
      { expiresIn: "30d" }
    );

    res.status(201).json({ user: result, token });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Signup failed.", error: error.message });
  }
};
export const signinNurse = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the user exists
    const existingUser = await Nurse.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the password is correct
    const matchPassword = await bcrypt.compare(password, existingUser.password);
    if (!matchPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        email: existingUser.email,
        id: existingUser._id,
        usertype: existingUser.usertype,
      },
      SECRET,
      { expiresIn: "30d" }
    );

    // Send back the user details and token
    res.status(200).json({ user: existingUser, token });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ message: "Signin failed", error: error.message });
  }
};

const TWILIO_ACCOUNT_SID = "AC35d86e0d9c60d2eb91c76053c7c863e1";
const TWILIO_AUTH_TOKEN = "ee3d620954c9e24f4388300475d433e7";

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

export const signupPatient = async (req, res) => {
  const { name, age, gender, address, email, password, phoneNumber } = req.body;

  try {
    const existingUser = await NonPatient.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newPatient = new NonPatient({
      name,
      age,
      gender,
      address,
      email,
      phoneNumber,
      password: hashedPassword,
    });
    await newPatient.save();

    // Send OTP using Twilio SMS API
    const otp = Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit OTP
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes from now
    const messageBody = `Your verification code is: ${otp}`;

    const msgOptions = {
      from: +14152149378,
      to: phoneNumber,
      body: messageBody,
    };
    await client.messages.create(msgOptions);

    // Save OTP with expiration
    newPatient.otp = { code: otp, expiresAt };
    await newPatient.save();

    res.status(201).json({
      message: "Patient registration successful. OTP sent for verification.",
    });
  } catch (error) {
    console.error("Error during registration:", error);
    res
      .status(500)
      .json({ message: "Error during registration", error: error.message });
  }
};

export const signinPatient = async (req, res) => {
  const { phoneNumber } = req.body;

  try {
    const patient = await NonPatient.findOne({ phoneNumber });
    if (!patient) {
      return res.status(400).json({ message: "Phone number not registered" });
    }

    // Send OTP using Twilio SMS API
    const otp = Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit OTP
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes from now
    const messageBody = `Your verification code is: ${otp}`;

    const msgOptions = {
      from: "+14152149378",
      to: phoneNumber,
      body: messageBody,
    };
    await client.messages.create(msgOptions);

    // Save OTP with expiration
    patient.otp = { code: otp, expiresAt };
    await patient.save();

    res.status(200).json({ message: "OTP sent to phone number" });
  } catch (error) {
    console.error("Error during sign-in:", error);
    res
      .status(500)
      .json({ message: "Error during sign-in", error: error.message });
  }
};
export const verifyOTP = async (req, res) => {
  const { phoneNumber, otp } = req.body;
  console.log("Request Body:", req.body); // Log the entire request body

  try {
    // Retrieve the patient using the phone number
    const patient = await NonPatient.findOne({ phoneNumber });

    // Check if the patient was found
    if (!patient) {
      return res.status(400).json({ message: "Phone number not registered" });
    }

    // Log the stored OTP if patient exists
    console.log("Stored OTP:", patient.otp ? patient.otp.code : "No OTP found");

    // Validate OTP
    if (!patient.otp || patient.otp.code !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Check if OTP has expired
    if (new Date() > patient.otp.expiresAt) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    // Generate JWT token
    const token = jwt.sign({ id: patient._id, usertype: "patient" }, SECRET, {
      expiresIn: "30d",
    });

    // Clear the OTP after successful verification
    patient.otp = null;
    await patient.save();

    res.status(200).json({ message: "Signin successful", token });
  } catch (error) {
    console.error("Error during OTP verification:", error);
    res
      .status(500)
      .json({ message: "Error during OTP verification", error: error.message });
  }
};
