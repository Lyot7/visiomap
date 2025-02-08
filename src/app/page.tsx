"use client";
import CallInvitationModal from '@/components/CallInvitationModal';
import Map from "@/components/Map";
import VideoCall from '@/components/VideoCall';
import useAccelerometer from '@/hooks/useAccelerometer';
import useWebSocket, { User } from "@/hooks/useWebSocket";
import dotenv from "dotenv";
import { useCallback, useEffect, useState } from 'react';

dotenv.config();

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [myID, setMyID] = useState<string>(""); // On utilise une string (ID généré par uuid)
  const [isModalOpen, setModalOpen] = useState(false);
  // Pour le caller (celui qui initie l'appel) on stocke l'ID de la personne appelée
  const [callerIdForCall, setCallerIdForCall] = useState<string>("");
  const [callerName, setCallerName] = useState<string>("Quelqu'un");
  // Une fois l'appel accepté, on enregistre le rôle et l'ID du pair
  const [callData, setCallData] = useState<{ role: "caller" | "callee"; remoteId: string } | null>(null);

  // Initialisation du WebSocket avec des callbacks pour la signalisation d'appel
  const { socket, sendCallInvitation, handleConnect, handleDeny, sendSpeed } = useWebSocket(
    setUsers,
    setMyID,
    setModalOpen,
    setCallerName,
    setCallerIdForCall,
    setCallData
  );

  // Pour le caller : quand on clique sur "Appeler", on envoie une invitation
  const handleConnectRequest = (receiverId: string) => {
    console.log(`Calling user ${receiverId} from user ${myID}`);
    sendCallInvitation(myID, receiverId, users);
  };

  const handleCallEnded = useCallback(() => {
    console.log('Call ended');
    setCallData(null);
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    sendSpeed(speed);
  }, [sendSpeed]);

  useEffect(() => {
    if (socket) {
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "call-ended") {
          setCallData(null);
        }
      };
    }
  }, [socket]);

  // Add the hook at the component level
  useAccelerometer(handleSpeedChange);

  return (
    <main className="flex min-h-screen flex-row items-center justify-between px-24 py-12 gap-8 h-screen">
      <CallInvitationModal
        isModalOpen={isModalOpen}
        onAccept={() => {
          console.log('Call accepted (callee)');
          // Pour le callee, on notifie le serveur via "connect" puis on démarre la visio
          handleConnect(callerIdForCall, myID);
          // Ici, on précise notre rôle de callee et l'ID du pair (l'appelant)
          setCallData({ role: "callee", remoteId: callerIdForCall });
          setModalOpen(false);
        }}
        onDeny={() => {
          console.log('Call denied');
          handleDeny();
          setModalOpen(false);
        }}
        callerName={callerName}
      />
      <Map users={users} />
      <section>
        <h1 className="text-3xl font-bold">Trouvez vos collègues et lancez une visio</h1>
        <div>
          <h2>Utilisateurs connectés:</h2>
          <ul>
            {users.map((user, index) => (
              String(user.id) !== myID ? (
                <li key={index} className="mb-4">
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      <h3 className="text-2xl mr-2">{user.name}</h3>
                      <button
                        onClick={() => handleConnectRequest(String(user.id))}
                        className="ml-2 bg-blue-500 text-white px-4 py-2 rounded"
                      >
                        Appeler
                      </button>
                    </div>
                    <div className="text-xl">
                      <p>Position: {user.coordinates.lat}, {user.coordinates.lng}</p>
                      <p>Vitesse: {user.speed !== undefined ?
                        `${user.speed.toFixed(2)} m/s²` :
                        'Données de l\'accélérateur non disponibles sur cet appareil'
                      }</p>
                    </div>
                  </div>
                </li>
              ) : (
                <li key={index} className="mb-4">
                  <div className="flex flex-col">
                    <h3 className="text-2xl mr-2">C&apos;est moi 😉</h3>
                    <div className="text-xl">
                      <p>Position: {user.coordinates.lat}, {user.coordinates.lng}</p>
                      <p>Vitesse: {user.speed !== undefined ?
                        `${user.speed.toFixed(2)} m/s²` :
                        'Données de l\'accélérateur non disponibles sur cet appareil'
                      }</p>
                    </div>
                  </div>
                </li>
              )
            ))}
          </ul>
        </div>
      </section>

      {/* Dès qu'un appel est établi, on affiche la visio */}
      {callData && socket && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-80 flex items-center justify-center">
          <VideoCall
            socket={socket}
            myID={myID}
            remoteId={callData.remoteId}
            role={callData.role}
            onCallEnded={handleCallEnded}
          />
        </div>
      )}
    </main>
  );
}