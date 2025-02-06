// page.tsx
"use client";
import Map from "@/components/Map";
import CallInvitationModal from '@/components/CallInvitationModal';
import React, { useState, useEffect } from 'react';
import dotenv from "dotenv";
import useWebSocket from "@/hooks/useWebSocket";
import { User } from "@/hooks/useWebSocket";

dotenv.config();

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [myID, setMyID] = useState<number>(0);
  const [isModalOpen, setModalOpen] = useState(false);
  const [receiverId, setReceiverId] = useState<number>(0);
  useEffect(() => {
    // console.log(users);
  }, [users]);

  const { sendCallInvitation, handleAccept, handleDeny } = useWebSocket(process.env.NEXT_PUBLIC_PORT!, setUsers, setMyID, setModalOpen);

  const handleConnectRequest = (receiverId: number) => {
    console.log(`Calling user ${receiverId} from user ${myID}`);
    setReceiverId(receiverId);
    sendCallInvitation(myID.toString(), receiverId.toString());
  };

  const callerName = users.find((user) => user.id === myID)?.name || "Quelqu'un";

  return (
    <main className="flex min-h-screen flex-row items-center justify-between px-24 py-12 gap-8 h-screen">
      <CallInvitationModal isOpen={isModalOpen}
        onAccept={() => {
          console.log('Call accepted');
          handleAccept(receiverId.toString(), myID.toString());
          setModalOpen(false);
        }}
        onDeny={() => {
          console.log('Call denied');
          handleDeny();
          setModalOpen(false);
        }}
        callerName={callerName} />
      <Map users={users} />
      <section>
        <h1 className="text-3xl font-bold">Trouvez vos collègues et lancez une visio</h1>
        <div>
          <h2>Utilisateurs connectés:</h2>
          <ul>
            {users.map((user, index) => (
              user.id != myID ? (
                <li key={index} className="mb-4 flex items-center">
                  <h3 className="text-2xl mr-2">{user.name}</h3>
                  <h2 className="text-xl">{user.coordinates.lat}, {user.coordinates.lng}</h2>
                  <button onClick={() => handleConnectRequest(user.id)} className="ml-2 bg-blue-500 text-white px-4 py-2 rounded">Appeler</button>
                </li>
              ) : (
                <li key={index} className="mb-4 flex items-center">
                  <h3 className="text-2xl mr-2">C&apos;est moi 😉</h3>
                  <h2 className="text-xl">{user.coordinates.lat}, {user.coordinates.lng}</h2>
                </li>
              )
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
