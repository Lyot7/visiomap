"use client";
import { useEffect, useState } from "react";

export interface User {
  id: number;
  name: string;
  coordinates: { lat: number; lng: number };
}

export const useWebSocket = (
  port: string,
  setUsers: React.Dispatch<React.SetStateAction<User[]>>,
  setMyID: React.Dispatch<React.SetStateAction<string>>,
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>,
  setCallerName: React.Dispatch<React.SetStateAction<string>>,
  setCallerIdForCall: React.Dispatch<React.SetStateAction<string>>,
  setCallData: React.Dispatch<
    React.SetStateAction<{ role: "caller" | "callee"; remoteId: string } | null>
  >
) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    const newSocket = new WebSocket(
      `wss://${window.location.hostname}:${port}`
    );
    setSocket(newSocket);
    return () => newSocket.close();
  }, [port]);

  const handleConnect = (userId: string, myID: string) => {
    if (socket) {
      socket.send(
        JSON.stringify({
          action: "connect",
          userId,
          myID,
        })
      );
    }
  };

  const sendCallInvitation = (
    callerId: string,
    recieverId: string,
    users: User[]
  ) => {
    if (socket) {
      const caller = users.find((user) => user.id.toString() === callerId);
      socket.send(
        JSON.stringify({
          action: "call-invitation",
          callerId: callerId,
          recieverId: recieverId,
          callerName: caller ? caller.name : "Quelqu'un",
        })
      );
    }
  };

  const handleDeny = () => {
    if (socket) {
      socket.send(JSON.stringify({ action: "deny" }));
    }
  };

  useEffect(() => {
    if (socket) {
      socket.onopen = () => {
        let userId = "";
        socket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === "userID") {
            userId = data.id;
            setMyID(userId);
          } else if (data.type === "newUser") {
            setUsers(data.users);
          } else if (data.type === "call-invitation") {
            console.log(`Received call invitation from ${data.callerId}`);
            setCallerName(data.callerName);
            setCallerIdForCall(data.callerId);
            setModalOpen(true);
          } else if (data.type === "call-accepted") {
            console.log(`Call accepted by ${data.from}`);
            // Le caller reçoit la confirmation et démarre la visio
            setCallData({ role: "caller", remoteId: data.from });
          }
        };

        const name = prompt("Donne moi ton p'tit nom") || "Anonymous";
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coordinates = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            socket.send(
              JSON.stringify({
                type: "connection",
                name: name,
                coordinates: coordinates,
              })
            );
          },
          () => {
            console.log("Failed to get user's location");
            socket.send(
              JSON.stringify({
                type: "connection",
                name: "Anonymous",
                coordinates: { lat: 0, lng: 0 },
              })
            );
          }
        );
      };

      // Optionnel : demande périodique de la liste des utilisateurs
      const intervalId = setInterval(() => {
        socket.send(JSON.stringify({ action: "get-users" }));
      }, 8000);

      return () => clearInterval(intervalId);
    }
  }, [
    socket,
    port,
    setUsers,
    setMyID,
    setModalOpen,
    setCallerName,
    setCallerIdForCall,
    setCallData,
  ]);

  return {
    socket,
    handleConnect,
    sendCallInvitation,
    handleDeny,
  };
};

export default useWebSocket;
