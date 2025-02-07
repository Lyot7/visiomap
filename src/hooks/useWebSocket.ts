"use client";
import { useEffect, useState, useCallback } from "react";

export interface User {
  id: number;
  name: string;
  coordinates: { lat: number; lng: number };
}

const useWebSocket = (
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

  // Use a callback that sends data only when the WebSocket is open.
  const safeSend = useCallback(
    (data: Record<string, unknown>): void => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(data));
      } else {
        console.warn("WebSocket is not open. Cannot send message:", data);
      }
    },
    [socket]
  );

  useEffect(() => {
    const newSocket = new WebSocket(
      `wss://eliott.bouquerel.caen.mds-project.fr:7864`
    );
    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  const handleConnect = (userId: string, myID: string) => {
    safeSend({
      action: "connect",
      userId,
      myID,
    });
  };

  const sendCallInvitation = (
    callerId: string,
    recieverId: string,
    users: User[]
  ) => {
    const caller = users.find((user) => user.id.toString() === callerId);
    safeSend({
      action: "call-invitation",
      callerId: callerId,
      recieverId: recieverId,
      callerName: caller ? caller.name : "Quelqu'un",
    });
  };

  const handleDeny = () => {
    safeSend({ action: "deny" });
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
            // For the caller, once confirmed, start the video call
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
            safeSend({
              type: "connection",
              name: name,
              coordinates: coordinates,
            });
          },
          () => {
            console.log("Failed to get user's location");
            safeSend({
              type: "connection",
              name: "Anonymous",
              coordinates: { lat: 0, lng: 0 },
            });
          }
        );
      };

      // Optionally, periodically request the list of users.
      const intervalId = setInterval(() => {
        safeSend({ action: "get-users" });
      }, 5000);

      return () => clearInterval(intervalId);
    }
  }, [
    socket,
    port,
    safeSend,
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
