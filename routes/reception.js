import express from "express";
import {
  acceptAppointment,
  addPatient,
  assignDoctor,
  dischargeByReception,
  dischargePatientByReception,
  generateBillForDischargedPatient,
  generateDeclaration,
  generateFinalReceipt,
  getDischargedPatientHistory,
  getDoctorAdvic1,
  getDoctorAdvice,
  getDoctorSheet,
  getDoctorsPatient,
  getLastRecordWithFollowUps,
  listAllPatientsWithLastRecord,
  listDoctors,
  listPatients,
} from "../controllers/admin/receiptionController.js";
import {
  signinDoctor,
  signupDoctor,
  signupNurse,
} from "../controllers/userController.js";
import upload from "../helpers/multer.js";

const receiptionRouter = express.Router();

receiptionRouter.post("/addDoctor", upload.single("image"), signupDoctor);
receiptionRouter.post("/addNurse", signupNurse);
receiptionRouter.post("/addPatient", upload.single("image"), addPatient);
receiptionRouter.get("/listDoctors", listDoctors);
receiptionRouter.get("/listPatients", listPatients);
receiptionRouter.post("/assign-Doctor", assignDoctor);
receiptionRouter.get(
  "/getPatientAssignedToDoctor/:doctorName",
  getDoctorsPatient
);
receiptionRouter.post("/acceptAppointment", acceptAppointment);
receiptionRouter.post("/dischargePatient", dischargePatientByReception);
receiptionRouter.post("/bill", generateBillForDischargedPatient);
receiptionRouter.post("/addDoctorToPatient");
receiptionRouter.get(
  "/getDischargedPatient/:patientId",
  getDischargedPatientHistory
);
receiptionRouter.get("/getAllDischargedPatient", listAllPatientsWithLastRecord);
receiptionRouter.get("/getDoctorAdvice/:patientId", getDoctorAdvice);
receiptionRouter.get(
  "/getDoctorAdvice/:patientId/:admissionId",
  getDoctorAdvic1
);
receiptionRouter.get(
  "/receipt/:patientId/:amountPaid/:billingAmount",
  generateFinalReceipt
);
receiptionRouter.get("/declaration", generateDeclaration);
receiptionRouter.get("/doctorSheet/:patientId", getDoctorSheet);
receiptionRouter.put(
  "/dischargeByReceptionCondition/:patientId/:admissionId",
  dischargeByReception
);
receiptionRouter.get(
  "/getLastFollowUps/:patientId",
  getLastRecordWithFollowUps
);

export default receiptionRouter;
