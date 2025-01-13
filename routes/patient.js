import express from "express";
import {
  signinPatient,
  signupPatient,
  verifyOTP,
} from "../controllers/userController.js";
import { createNonPatientAppointment } from "../controllers/admin/patientController.js";

const patientRouter = express.Router();

patientRouter.post("/signup", signupPatient);
patientRouter.post("/signin", signinPatient);
patientRouter.post("/verify-otp", verifyOTP);
patientRouter.post("/createAppointment", createNonPatientAppointment);

// patientRouter.get("/profile", auth, getUserProfile);
// patientRouter.patch("/edit-profile", auth, upload.single("image"), editProfile);

export default patientRouter;
