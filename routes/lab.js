import express from "express";
import { auth } from "./../middleware/auth.js";
import {
  generateReportPdfForPatient,
  getPatientsAssignedToLab,
} from "../controllers/labController.js";
import upload from "../helpers/multer.js";
const labRouter = express.Router();

//labRouter.post("/signup", signup);
labRouter.get("/getlabPatients", getPatientsAssignedToLab);
labRouter.post(
  "/upload-lab-report",
  upload.single("image"),
  generateReportPdfForPatient
);

export default labRouter;
