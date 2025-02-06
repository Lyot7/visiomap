// page.tsx
"use client";
import Map from "@/components/Map";
import React, { useState, useEffect } from 'react';
import dotenv from "dotenv";
import useWebSocket, { User } from "@/hooks/useWebSocket"; // Adjust the import path as necessary

dotenv.config();

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const port = process.env.NEXT_PUBLIC_PORT || "3000"; // Default to 3000 if the port is not provided
  const connectedUsers = useWebSocket(port); // Use the custom hook

  useEffect(() => {
    setUsers(connectedUsers); // Update state when users change
  }, [connectedUsers]);

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
