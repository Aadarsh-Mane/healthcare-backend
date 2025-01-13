import multer from "multer";

const storage = multer.memoryStorage(); // Use memory storage
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit

  storage,
});

export default upload;
