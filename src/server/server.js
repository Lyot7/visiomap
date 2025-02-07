import express from "express";
import bodyParser from "body-parser";
import { WebSocketServer } from "ws";
import cors from "cors";
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
console.log(sslOptions);

// Create a WebSocket server
const server = https.createServer(sslOptions, app);
const wss = new WebSocketServer({ server });

// Handle WebSocket connections
wss.on("connection", (wss) => {
  const userId = uuidv4();
  wss.userId = userId;

  wss.send(
    JSON.stringify({
      type: "userID",
      id: userId,
    })
  );

  wss.on("message", (message) => {
    const data = JSON.parse(message);

    if (data.type === "connection") {
      const user = { id: userId, ...data };
      users.push(user);
      // Diffuse la nouvelle liste d'utilisateurs à tous les clients
      wss.clients.forEach((client) => {
        if (client.readyState === ws.OPEN) {
          client.send(JSON.stringify({ type: "newUser", users }));
        }
      });
    }

    switch (data.action) {
      case "get-users":
        wss.send(JSON.stringify({ type: "users", users }));
        break;
      case "call-invitation":
        {
          const callerId = data.callerId.toString();
          const recieverId = data.recieverId.toString();
          const recipient = [...wss.clients].find(
            (client) => client.userId === recieverId
          );
          const callerName = data.callerName;
          console.log("recipient : ", recipient);
          if (recipient && recipient.readyState === wss.OPEN) {
            recipient.send(
              JSON.stringify({
                type: "call-invitation",
                callerId: callerId,
                callerName: callerName,
              })
            );
          }
        }
        break;
      case "connect":
        {
          // Le callee notifie qu'il accepte l'appel
          // On récupère le caller via l'ID contenu dans data.userId
          const targetSocket = [...wss.clients].find(
            (client) => client.userId === data.userId.toString()
          );
          if (targetSocket && targetSocket.readyState === wss.OPEN) {
            targetSocket.send(
              JSON.stringify({
                type: "call-accepted",
                from: data.myID, // L'ID du callee
              })
            );
          }
        }
        break;
      // Messages de signalisation WebRTC
      case "webrtc-offer":
        {
          const targetSocket = [...wss.clients].find(
            (client) => client.userId === data.target.toString()
          );
          if (targetSocket && targetSocket.readyState === wss.OPEN) {
            // On ajoute l'ID de l'expéditeur pour que le pair sache d'où vient l'offre
            data.source = wss.userId;
            targetSocket.send(JSON.stringify(data));
          }
        }
        break;
      case "webrtc-answer":
        {
          const targetSocket = [...wss.clients].find(
            (client) => client.userId === data.target.toString()
          );
          if (targetSocket && targetSocket.readyState === wss.OPEN) {
            data.source = wss.userId;
            targetSocket.send(JSON.stringify(data));
          }
        }
        break;
      case "webrtc-ice":
        {
          const targetSocket = [...wss.clients].find(
            (client) => client.userId === data.target.toString()
          );
          if (targetSocket && targetSocket.readyState === wss.OPEN) {
            data.source = wss.userId;
            targetSocket.send(JSON.stringify(data));
          }
        }
        break;
      case "deny":
        // Vous pouvez implémenter la logique de refus d'appel ici
        break;
      default:
        break;
    }
  });

  wss.on("close", () => {
    console.log("Client disconnected");
    // Retirer l'utilisateur déconnecté
    users = users.filter((user) => user.id !== userId);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port : ${PORT}`);
});
