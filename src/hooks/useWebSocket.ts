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
  setMyID: React.Dispatch<React.SetStateAction<number>>,
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>
) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    const newSocket = new WebSocket(`ws://${window.location.hostname}:${port}`);
    setSocket(newSocket);
    return () => newSocket.close();
  }, [port]);

  const handleConnect = (userId: string, myID: string) => {
    if (socket) {
      socket.send(JSON.stringify({ action: "connect", userId, myID }));
    }
  };

  const sendCallInvitation = (callerId: string, receiverId: string) => {
    if (socket) {
      socket.send(
        JSON.stringify({ action: "call-invitation", callerId, receiverId })
      );
    }
  };

  const handleAccept = (receiverId: string, myID: string) => {
    handleConnect(receiverId, myID);
  };

  const handleDeny = () => {
    if (socket) {
      socket.send(JSON.stringify({ action: "deny" }));
    }
  };

  useEffect(() => {
    if (socket) {
      socket.onopen = () => {
        let userId = 1234;
        socket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === "userID") {
            userId = data.id;
            setMyID(userId);
          }
        };
        const name = prompt("Donne moi ton p'tit nom") || "Anonymous";
        const coordinates = {
          lat: 0,
          lng: 0,
        };
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
        socket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === "newUser") {
            setUsers(data.users);
          } else if (data.type === "call-invitation") {
            console.log(`Someone is trying to call you: ${data.callerId}`);
            setModalOpen(true);
          }
        };
        const user: User = {
          id: userId,
          name: name,
          coordinates: coordinates,
        };
        setUsers((prevState) => [...prevState, user]);
      };

      setInterval(() => {
        socket.send(JSON.stringify({ type: "getUsers" }));
      }, 2000);
    }
  }, [socket, port, setUsers]);

  return {
    socket,
    handleConnect,
    sendCallInvitation,
    handleAccept,
    handleDeny,
  };
};

export default useWebSocket;
