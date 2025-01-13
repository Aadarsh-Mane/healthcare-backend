import io from "socket.io-client";

// Connect to the Socket.IO server
const socket = io("http://localhost:3000");

// Example users
const user1 = "doctor1www"; // Sender (could be a doctor)
const user2 = "patient4ww"; // Receiver (could be a patient)

// Join the room for a 1v1 chat and get previous chat history
socket.emit("joinRoom", { user1, user2 });

// Listen for previous chat history
socket.on("chatHistory", (chatHistory) => {
  console.log("Previous chat history:");
  chatHistory.forEach((msg) => {
    console.log(
      `${msg.sender}: ${msg.message} (at ${new Date(
        msg.timestamp
      ).toLocaleString()})`
    );
  });
});

// Listen for incoming messages
socket.on("receiveMessage", (data) => {
  console.log(`Received message from ${data.sender}: ${data.message}`);
});

// Function to send a message from user1 to user2
function sendMessage(message) {
  console.log(`Sending message from ${user1} to ${user2}: ${message}`);
  socket.emit("sendMessage", {
    sender: user1,
    receiver: user2,
    message: message,
  });
}

// Test: Send a message from user1 to user2
setTimeout(() => {
  sendMessage("Hello, how are you?");
}, 2000);

// Send another message after a delay
setTimeout(() => {
  sendMessage("Do you need any help?");
}, 5000);
