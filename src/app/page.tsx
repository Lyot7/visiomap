"use client";
import CallInvitationModal from '@/components/CallInvitationModal';
import Map from "@/components/Map";
import VideoCall from '@/components/VideoCall';
import useWebSocket, { User } from "@/hooks/useWebSocket";
import dotenv from "dotenv";
import { useEffect, useState } from 'react';

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
  const [showVideoCall, setShowVideoCall] = useState(false);

  // Initialisation du WebSocket avec des callbacks pour la signalisation d'appel
  const { socket, sendCallInvitation, handleConnect, handleDeny } = useWebSocket(
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

  useEffect(() => {
    if (socket) {
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "call-ended") {
          setCallData(null);
          setShowVideoCall(false);
        }
      };
    }
  }, [socket]);

  return (
    <main className="flex min-h-screen flex-row items-center justify-between px-24 py-12 gap-8 h-screen">
      <CallInvitationModal
        isModalOpen={isModalOpen}
        onAccept={() => {
          console.log('Call accepted (callee)');
          handleConnect(callerIdForCall, myID);
          setCallData({ role: "callee", remoteId: callerIdForCall });
          setShowVideoCall(true);
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
                <li key={index} className="mb-4 flex items-center">
                  <h3 className="text-2xl mr-2">{user.name}</h3>
                  <h2 className="text-xl">{user.coordinates.lat}, {user.coordinates.lng}</h2>
                  <button
                    onClick={() => handleConnectRequest(String(user.id))}
                    className="ml-2 bg-blue-500 text-white px-4 py-2 rounded"
                  >
                    Appeler
                  </button>
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

      {/* Afficher la visio seulement si showVideoCall est true */}
      {callData && socket && showVideoCall && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-80 flex items-center justify-center">
          <VideoCall
            socket={socket}
            myID={myID}
            remoteId={callData.remoteId}
            role={callData.role}
            onHangup={() => setCallData(null)}
          />
        </div>
      )}
    </main>
  );
}
