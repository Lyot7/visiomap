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

// Middleware : autorise les requêtes CORS et parse le corps des requêtes au format JSON
app.use(cors());
app.use(bodyParser.json());

// Route racine : message d'accueil pour l'API
app.get("/", (req, res) => {
  res.send("Welcome to the User Management API!");
});

// Stockage des utilisateurs en mémoire (pour la démo)
let users = [];

// Création d'un serveur HTTP et attachement du serveur WebSocket
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Gestion des connexions WebSocket
wss.on("connection", (client) => {
  console.log("New WebSocket connection established.");
  const userId = uuidv4();
  // Associe un identifiant unique au client connecté
  client.userId = userId;

  // Envoie de l'ID utilisateur au client
  client.send(JSON.stringify({ type: "userID", id: userId }));

  // Traitement des messages entrants
  client.on("message", (message) => {
    console.log("Received message:", message.toString());
    const data = JSON.parse(message.toString());

    // Ajout de l'utilisateur lors de la connexion
    if (data.type === "connection") {
      const user = { id: userId, ...data };
      users.push(user);
      // Broadcast de la nouvelle liste des utilisateurs à tous les clients
      wss.clients.forEach((c) => {
        if (c.readyState === WebSocket.OPEN) {
          c.send(JSON.stringify({ type: "newUser", users }));
        }
      });
    }

    // Traitement des actions ou types de messages
    switch (data.action || data.type) {
      case "get-users":
        console.log("Sending user list to client.");
        client.send(JSON.stringify({ type: "users", users }));
        break;
      case "call-invitation": {
        // Envoi d'une invitation d'appel d'un utilisateur vers un autre
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
        // Lorsque le callee accepte l'appel, notifie le caller
        const targetSocket = [...wss.clients].find(
          (c) => c.userId === data.userId.toString()
        );
        if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
          targetSocket.send(
            JSON.stringify({
              type: "call-accepted",
              from: data.myID, // ID du callee
            })
          );
        }
        break;
      }
      // Traitement des messages de signalisation WebRTC
      case "webrtc-offer": {
        const targetSocket = [...wss.clients].find(
          (c) => c.userId === data.target.toString()
        );
        if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
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
        // Cas où l'appel est refusé par le destinataire
        console.log("deny");
        break;
      }
      case "hangup": {
        // Traitement de la fin d'appel (raccrocher)
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
        // Mise à jour de la vitesse de l'utilisateur
        const user = users.find((u) => u.id === client.userId);
        if (user) {
          console.log("data from update-speed : ", data);
          user.speed = data.speed;
          console.log("Speed received from client:", data.speed);
          // Broadcast de la liste mise à jour des utilisateurs
          wss.clients.forEach((c) => {
            if (c.readyState === WebSocket.OPEN) {
              c.send(JSON.stringify({ type: "newUser", users }));
              console.log("Updated users:", users);
            }
          });
        }
        break;
      }
      case "connection-update": {
        // Mise à jour des informations de l'utilisateur (vitesse, support, permission)
        const userIndex = users.findIndex((u) => u.id === client.userId);
        if (userIndex !== -1) {
          users[userIndex] = {
            ...users[userIndex],
            speed: data.speed,
            isSupported: data.isSupported,
            permissionStatus: data.permissionStatus,
          };
          console.log("User updated with connection-update:", users[userIndex]);
          wss.clients.forEach((c) => {
            if (c.readyState === WebSocket.OPEN) {
              c.send(JSON.stringify({ type: "newUser", users }));
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

  // Suppression de l'utilisateur lors de la déconnexion du client
  client.on("close", () => {
    console.log("Client disconnected");
    users = users.filter((user) => user.id !== userId);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
