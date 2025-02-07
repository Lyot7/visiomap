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
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>,
  setCallerName: React.Dispatch<React.SetStateAction<string>>
) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    const newSocket = new WebSocket(`ws://${window.location.hostname}:${port}`);
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
    callerId: number,
    recieverId: number,
    users: User[]
  ) => {
    if (socket) {
      const caller = users.find((user) => user.id == callerId);

      socket.send(
        JSON.stringify({
          action: "call-invitation",
          callerId: callerId,
          recieverId: recieverId,
          callerName: caller ? caller.name.toString() : "Quelqu'un",
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
        let userId = 1234;
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
            setModalOpen(true);
          } else if (data.type === "call-accepted") {
            console.log(`Call with ${data.from} has been accepted`);
          } else if (data.type === "call-rejected") {
            console.log(`Call with ${data.from} has been rejected`);
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

        const user: User = {
          id: userId,
          name: name,
          coordinates: coordinates,
        };
        setUsers((prevState) => [...prevState, user]);
      };

      setInterval(() => {
        socket.send(JSON.stringify({ type: "getUsers" }));
      }, 8000);
    }
  }, [socket, port, setUsers]);

  return {
    socket,
    handleConnect,
    sendCallInvitation,
    handleDeny,
  };
};

export default useWebSocket;
