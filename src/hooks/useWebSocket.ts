"use client";
import { useEffect } from "react";

export interface User {
  id: number;
  name: string;
  coordinates: { lat: number; lng: number };
}

export const useWebSocket = (
  port: string,
  users: User[],
  setUsers: React.Dispatch<React.SetStateAction<User[]>>
) => {
  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.hostname}:${port}`);

    ws.onopen = () => {
      const userId = Date.now();
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
          console.log("User's coordinates:", coordinates);

          ws.send(
            JSON.stringify({
              type: "connection",
              name: name,
              coordinates: coordinates,
            })
          );
        },
        () => {
          console.log("Failed to get user's location");

          ws.send(
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
      ws.send(JSON.stringify({ type: "getUsers" }));
    }, 2000);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "newUser") {
        setUsers(data.users);
      }
    };

    return () => {
      ws.close();
    };
  }, [port]);
};

export default useWebSocket;
