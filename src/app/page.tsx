"use client";
import Map from "@/components/Map";
import React, { useState, useEffect } from 'react';
import dotenv from "dotenv";
dotenv.config();

export interface User {
  id: number;
  name: string;
  coordinates: { lat: number; lng: number };
  // Add any other properties relevant to your user
}

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    console.log("users updated:", users);
  }, [users]);

  useEffect(() => {
    // Establish WebSocket connection
    const ws = new WebSocket(`ws://${window.location.hostname}:${process.env.NEXT_PUBLIC_PORT}`);

    ws.onopen = () => {
      const name = prompt("Donne moi ton p'tit nom") || "Anonymous";
      // Get user's current coordinates
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coordinates = { lat: position.coords.latitude, lng: position.coords.longitude };
          console.log("User's coordinates:", coordinates);

          // Send the user's name and coordinates to the server after retrieving them
          ws.send(JSON.stringify({ type: "connection", name: name, coordinates: coordinates }));
        },
        () => {
          console.log("Failed to get user's location");
          // Optionally, you can still send the default coordinates or handle the error
          ws.send(JSON.stringify({ type: "connection", name: name, coordinates: { lat: 0, lng: 0 } }));
        }
      );
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

    // Clean up the WebSocket connection on unmount
    return () => {
      ws.close();
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-row items-center justify-between px-24 py-12 gap-8 h-screen">
      <Map users={users} />
      <section>
        <h1 className="text-3xl font-bold">Trouvez vos collègues et lancez une visio</h1>
        <div>
          <h2>Utilisateurs connectés:</h2>
          <ul>
            {users.map((user, index) => (
              <li key={index}>{user.name}, {user.coordinates.lat}, {user.coordinates.lng}</li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
