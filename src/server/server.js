import express from "express";
import bodyParser from "body-parser";
import { WebSocketServer } from "ws";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import http from "http";

import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.NEXT_PUBLIC_PORT || 1234;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to the User Management API!");
});

// In-memory user storage (for demonstration purposes)
let users = [];

// Create a WebSocket server
const server = http.createServer(app);

const wss = new WebSocketServer({ server });

// Handle WebSocket connections
wss.on("connection", (ws) => {
  const userId = uuidv4();
  ws.userId = userId;

  ws.send(
    JSON.stringify({
      type: "userID",
      id: userId,
    })
  );

  ws.on("message", (message) => {
    const data = JSON.parse(message);
    if (data.type === "connection") {
      const user = { id: userId, ...data };
      users.push(user);
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: "newUser", users }));
        }
      });
    }
    switch (data.action) {
      case "get-users":
        ws.send(JSON.stringify({ type: "users", users }));
        break;
      case "call-invitation":
        const callerId = data.callerId;
        const recieverId = data.recieverId;
        console.log("callerId : ", callerId, " recieverId : ", recieverId);
        const recipient = [...wss.clients].find(
          (client) => client.userId === recieverId.toString()
        );
        console.log(
          "Connected clients:",
          [...wss.clients].map((client) => client.userId)
        );
        console.log("recipient : ", recipient);
        if (recipient) {
          recipient.send(
            JSON.stringify({
              type: "call-invitation",
              callerId: callerId,
              recieverId: recieverId,
            })
          );
        }
        break;
      default:
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    // remove the user from the users array when they disconnect
    users = users.filter((user) => user.id !== userId);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port : ${PORT}`);
});
