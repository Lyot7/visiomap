"use client";
import { useCallback, useEffect, useState } from "react";

export interface User {
  id: number;
  name: string;
  coordinates: { lat: number; lng: number };
  speed?: number;
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
        console.log("Sending data:", data);
        socket.send(JSON.stringify(data));
      } else {
        console.warn("WebSocket is not open. Cannot send message:", data);
      }
    },
    [socket]
  );

  useEffect(() => {
    console.log("Attempting to open WebSocket connection...");
    const newSocket = new WebSocket(`wss://${window.location.hostname}/ws/`);
    setSocket(newSocket);

    newSocket.onopen = () => {
      console.log("WebSocket connection opened.");
    };

    newSocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    newSocket.onclose = (event) => {
      console.log("WebSocket connection closed:", event);
    };

    return () => {
      console.log("Closing WebSocket connection...");
      newSocket.close();
    };
  }, []);

  const handleConnect = (userId: string, myID: string) => {
    console.log(`Connecting with userId: ${userId}, myID: ${myID}`);
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
    console.log(`Sending call invitation from ${callerId} to ${recieverId}`);
    safeSend({
      action: "call-invitation",
      callerId: callerId,
      recieverId: recieverId,
      callerName: caller ? caller.name : "Quelqu'un",
    });
  };

  const handleDeny = () => {
    console.log("Denying call invitation");
    safeSend({ action: "deny" });
  };

  const sendSpeed = useCallback(
    (speed: number) => {
      safeSend({
        action: "update-speed",
        speed: speed,
      });
    },
    [safeSend]
  );

  useEffect(() => {
    if (socket) {
      socket.onopen = () => {
        console.log("WebSocket is open, setting up message handlers.");
        let userId = "";
        socket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          console.log("Received message:", data);
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
            console.log(
              "Sending connection data with coordinates:",
              coordinates
            );
            safeSend({
              type: "connection",
              name: name,
              coordinates: coordinates,
            });
          },
          () => {
            console.log(
              "Failed to get user's location, sending default coordinates."
            );
            safeSend({
              type: "connection",
              name: "Anonymous",
              coordinates: { lat: 0, lng: 0 },
            });
          }
        );
      };

      const intervalId = setInterval(() => {
        console.log("Requesting user list...");
        safeSend({ action: "get-users" });
      }, 5000);

      return () => {
        console.log("Clearing user list request interval.");
        clearInterval(intervalId);
      };
    }
  }, [
    socket,
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
    sendSpeed,
  };
};

export default useWebSocket;
