import express from "express";
import { signinDoctor, signinNurse } from "../controllers/userController.js";
// import { signin, signup } from "../controllers/userController.js";
import { auth } from "./../middleware/auth.js";
import {
  addFollowUp,
  getAdmissionRecordsById,
  getFollowups,
  getLastFollowUpTime,
  getNurseProfile,
} from "../controllers/nurseController.js";

const nurseRouter = express.Router();

//nurseRouter.post("/signup", signup);
nurseRouter.post("/signin", signinNurse);
nurseRouter.get("/nurseProfile", auth, getNurseProfile);
nurseRouter.get("/addmissionRecords/:admissionId", getAdmissionRecordsById);
nurseRouter.post("/addFollowUp", auth, addFollowUp);
nurseRouter.get("/lastFollowUp", getLastFollowUpTime);
nurseRouter.get("/followups/:admissionId", getFollowups);
// nurseRouter.post("/signin", );

// nurseRouter.get("/profile", auth, getUserProfile);
// nurseRouter.patch("/edit-profile", auth, upload.single("image"), editProfile);

export default nurseRouter;
