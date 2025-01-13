import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Chat from "./models/chatSchema.js";

// Your secret key for JWT (keep this secure)
const SECRET = "DOCTOR";

export const socketHandler = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*", // Replace with your frontend's URL
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Socket.IO middleware to check the JWT token
  io.use((socket, next) => {
    const token = socket.handshake.headers["Authorization"];

    if (!token) {
      return next(new Error("Authentication error"));
    }

    try {
      const bearerToken = token.split(" ")[1];
      const decoded = jwt.verify(bearerToken, SECRET);
      socket.user = decoded; // decoded contains user data from the JWT token
      console.log("Authenticated user:", socket.user);

      next();
    } catch (error) {
      console.error("Token verification failed:", error);
      return next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Handle chat initiation when two doctors select each other to chat
    socket.on("startChat", async ({ otherDoctorId }) => {
      const userId = socket.user.id;
      console.log(
        `Doctor ${userId} wants to chat with Doctor ${otherDoctorId}`
      );

      const roomName = `${userId}-${otherDoctorId}`;

      // Join the room for both users
      socket.join(roomName);
      socket.to(roomName).emit("chatStarted", {
        message: `Doctor ${userId} has joined the chat`,
      });

      // Load previous chat history between the two doctors
      const chatHistory = await Chat.find({
        $or: [
          { sender: userId, receiver: otherDoctorId },
          { sender: otherDoctorId, receiver: userId },
        ],
      }).sort({ timestamp: 1 });

      // Send the chat history to both doctors
      socket.emit("chatHistory", chatHistory);
      socket.to(roomName).emit("chatHistory", chatHistory);
    });

    // Handle sending a message from one doctor to another
    socket.on("sendMessage", async ({ receiver, message }) => {
      const sender = socket.user.id;
      console.log(
        `Message from Doctor ${sender} to Doctor ${receiver}: ${message}`
      );

      // Save the message to the database
      const newMessage = new Chat({
        sender,
        receiver,
        message,
      });
      await newMessage.save();

      // Check if the receiver is connected
      const receiverSocket = Array.from(io.sockets.sockets.values()).find(
        (s) => s.user.id === receiver
      );

      if (receiverSocket) {
        // Receiver is online, send the message in real-time
        receiverSocket.emit("receiveMessage", { sender, message });
      } else {
        // Receiver is offline, the message is stored in the database
        console.log(
          `Receiver (Doctor ${receiver}) is offline, storing message.`
        );
      }

      // Also, send the message to the sender to confirm
      io.to(roomName).emit("receiveMessage", {
        sender,
        message,
      });
    });

    // Handle the user reconnecting
    socket.on("reconnect", async () => {
      const userId = socket.user.id;
      const missedMessages = await Chat.find({
        receiver: userId,
        isRead: false,
      });

      // Send missed messages to the user when they reconnect
      missedMessages.forEach((msg) => {
        socket.emit("receiveMessage", msg);
      });
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};
