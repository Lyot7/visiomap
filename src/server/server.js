import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import http from "http";
import { v4 as uuidv4 } from "uuid";
import { WebSocket, WebSocketServer } from "ws";
dotenv.config();

const app = express();

const PORT = process.env.NEXT_PUBLIC_PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to the User Management API!");
});

// In-memory user storage (for demonstration purposes)
let users = [];

// Create an HTTP server and attach a WebSocket server to it.
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Handle WebSocket connections
wss.on("connection", (client) => {
  console.log("New WebSocket connection established.");
  const userId = uuidv4();
  // Attach the generated userId to the client
  client.userId = userId;

  // Send the userID to the client
  client.send(JSON.stringify({ type: "userID", id: userId }));

  // Handle incoming messages from this client
  client.on("message", (message) => {
    console.log("Received message:", message.toString());
    const data = JSON.parse(message.toString());

    // If a connection message is received, add the user
    if (data.type === "connection") {
      const user = { id: userId, ...data };
      users.push(user);
      // Broadcast the updated user list to all clients
      wss.clients.forEach((c) => {
        if (c.readyState === WebSocket.OPEN) {
          c.send(JSON.stringify({ type: "newUser", users }));
        }
      });
    }

    // Process actions based on data.action
    switch (data.action) {
      case "get-users":
        console.log("Sending user list to client.");
        client.send(JSON.stringify({ type: "users", users }));
        break;
      case "call-invitation": {
        const callerId = data.callerId.toString();
        const receiverId = data.recieverId.toString();
        const recipient = [...wss.clients].find((c) => c.userId === receiverId);
        const callerName = data.callerName;
        console.log("recipient:", recipient);
        if (recipient && recipient.readyState === WebSocket.OPEN) {
          recipient.send(
            JSON.stringify({
              type: "call-invitation",
              callerId: callerId,
              callerName: callerName,
            })
          );
        }
        break;
      }
      case "connect": {
        // The callee notifies that they accept the call.
        // Find the caller using the provided userId.
        const targetSocket = [...wss.clients].find(
          (c) => c.userId === data.userId.toString()
        );
        if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
          targetSocket.send(
            JSON.stringify({
              type: "call-accepted",
              from: data.myID, // The callee's ID
            })
          );
        }
        break;
      }
      // WebRTC signaling messages
      case "webrtc-offer": {
        const targetSocket = [...wss.clients].find(
          (c) => c.userId === data.target.toString()
        );
        if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
          // Attach the sender's userId so the recipient knows who sent the offer
          data.source = client.userId;
          targetSocket.send(JSON.stringify(data));
        }
        break;
      }
      case "webrtc-answer": {
        const targetSocket = [...wss.clients].find(
          (c) => c.userId === data.target.toString()
        );
        if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
          data.source = client.userId;
          targetSocket.send(JSON.stringify(data));
        }
        break;
      }
      case "webrtc-ice": {
        const targetSocket = [...wss.clients].find(
          (c) => c.userId === data.target.toString()
        );
        if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
          data.source = client.userId;
          targetSocket.send(JSON.stringify(data));
        }
        break;
      }
      case "deny": {
        console.log("deny");
        break;
      }
      case "hangup": {
        const targetSocket = [...wss.clients].find(
          (c) => c.userId === data.target.toString()
        );
        if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
          console.log("Broadcasting call end to:", data.target);
          targetSocket.send(
            JSON.stringify({
              type: "call-ended",
              from: client.userId,
            })
          );
        }
        break;
      }
      case "update-speed": {
        const user = users.find((u) => u.id === client.userId);
        if (user) {
          console.log("data from update-speed : ", data);
          user.speed = data.speed;
          console.log("Speed received from client:", data.speed);
          // Broadcast the updated user list to all clients
          wss.clients.forEach((c) => {
            if (c.readyState === WebSocket.OPEN) {
              c.send(JSON.stringify({ type: "newUser", users }));
              console.log("Updated users:", users);
            }
          });
        }
        break;
      }
      default:
        console.log("Unknown action:", data.action);
        break;
    }
  });

  client.on("close", () => {
    console.log("Client disconnected");
    // Remove the disconnected user from the list
    users = users.filter((user) => user.id !== userId);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
