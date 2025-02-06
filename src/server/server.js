import express from "express";
import bodyParser from "body-parser";
import { WebSocketServer } from "ws";
import cors from "cors";

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
const server = app.listen(PORT, () => {
  console.log(`Server is running on port : ${PORT}`);
});

const wss = new WebSocketServer({ server });

// Handle WebSocket connections
wss.on("connection", (ws) => {
  const userId = Date.now();
  console.log("New client connected", userId);

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
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    // remove the user from the users array when they disconnect
    users = users.filter((user) => user.id !== userId);
  });
});

// API Endpoints
app.get("/users", (req, res) => {
  res.json(users);
});

app.post("/users", (req, res) => {
  const user = req.body;
  users.push(user);
  res.status(201).json(user);
});

app.get("/users/:id", (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (user) {
    res.json(user);
  } else {
    res.status(404).send("User not found");
  }
});

app.put("/users/:id", (req, res) => {
  const userIndex = users.findIndex((u) => u.id === req.params.id);
  if (userIndex !== -1) {
    users[userIndex] = { ...users[userIndex], ...req.body };
    res.json(users[userIndex]);
  } else {
    res.status(404).send("User not found");
  }
});

app.delete("/users/:id", (req, res) => {
  users = users.filter((u) => u.id !== req.params.id);
  res.status(204).send();
});
