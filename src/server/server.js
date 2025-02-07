import express from "express";
import bodyParser from "body-parser";
import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";
import https from "https";
import fs from "fs";
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

// Read your SSL certificates
const sslOptions = {
  key: fs.readFileSync(
    "/etc/letsencrypt/live/eliott.bouquerel.caen.mds-project.fr/privkey.pem"
  ),
  cert: fs.readFileSync(
    "/etc/letsencrypt/live/eliott.bouquerel.caen.mds-project.fr/fullchain.pem"
  ),
};

// Create an HTTPS server and attach a WebSocket server to it.
const server = https.createServer(sslOptions, app);
const wss = new WebSocketServer({ server });

// Handle WebSocket connections
wss.on("connection", (client) => {
  const userId = uuidv4();
  // Attach the generated userId to the client
  client.userId = userId;

  // Send the userID to the client
  client.send(JSON.stringify({ type: "userID", id: userId }));

  // Handle incoming messages from this client
  client.on("message", (message) => {
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
      default:
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
