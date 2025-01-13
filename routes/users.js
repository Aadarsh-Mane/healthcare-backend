import express from "express";
import { signinDoctor } from "../controllers/userController.js";
// import { signin, signup } from "../controllers/userController.js";

const userRouter = express.Router();

//userRouter.post("/signup", signup);
userRouter.post("/signin", signinDoctor);
// userRouter.post("/signin", );

// userRouter.get("/profile", auth, getUserProfile);
// userRouter.patch("/edit-profile", auth, upload.single("image"), editProfile);

export default userRouter;
