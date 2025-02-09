"use client";
import CallInvitationModal from '@/components/CallInvitationModal';
import Map from "@/components/Map";
import VideoCall from '@/components/VideoCall';
import useAccelerometer from '@/hooks/useAccelerometer';
import useWebSocket, { User } from "@/hooks/useWebSocket";
import dotenv from "dotenv";
import { useCallback, useEffect, useState } from 'react';

dotenv.config();

// Page principale qui affiche la carte, la liste des utilisateurs connectés et gère les appels vidéo.
export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  // Etat pour les utilisateurs affichés sur la carte (mise à jour uniquement lors de l'ajout)
  const [mapUsers, setMapUsers] = useState<User[]>([]);
  const [myID, setMyID] = useState<string>(""); // Identifiant unique généré par le serveur
  const [isModalOpen, setModalOpen] = useState(false);
  // Stocke l'ID de l'utilisateur à appeler
  const [callerIdForCall, setCallerIdForCall] = useState<string>("");
  const [callerName, setCallerName] = useState<string>("Quelqu'un");
  // Données de l'appel vidéo (rôle et identifiant du pair)
  const [callData, setCallData] = useState<{ role: "caller" | "callee"; remoteId: string } | null>(null);

  // Initialisation du WebSocket pour gérer la communication en temps réel et la signalisation d'appel
  const { socket, sendCallInvitation, handleConnect, handleDeny, sendSpeed } = useWebSocket(
    setUsers,
    setMyID,
    setModalOpen,
    setCallerName,
    setCallerIdForCall,
    setCallData
  );

  // Fonction pour initier un appel vers un autre utilisateur
  const handleConnectRequest = (receiverId: string) => {
    console.log(`Calling user ${receiverId} from user ${myID}`);
    sendCallInvitation(myID, receiverId, users);
  };

  // Callback pour gérer la fin d'un appel
  const handleCallEnded = useCallback(() => {
    console.log('Call ended');
    setCallData(null);
  }, []);

  // Callback pour envoyer la vitesse relevée par l'accéléromètre via WebSocket
  const handleSpeedChange = useCallback((speed: number) => {
    sendSpeed(speed);
  }, [sendSpeed]);

  // Récupère les données de l'accéléromètre (vitesse, support, permission)
  const { speed, isSupported, permissionStatus, requestPermission } = useAccelerometer(handleSpeedChange);

  // Ecoute les messages de fin d'appel sur le socket
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

  // Mise à jour de la carte : on ajoute les nouveaux utilisateurs
  useEffect(() => {
    setMapUsers((prevMapUsers) => {
      const newUsers = users.filter(user => !prevMapUsers.some(existingUser => existingUser.id === user.id));
      return newUsers.length > 0 ? [...prevMapUsers, ...newUsers] : prevMapUsers;
    });
  }, [users]);

  return (
    <main className="flex min-h-screen flex-row items-center justify-between px-24 py-12 gap-8 h-screen">
      {/* Modal d'invitation à l'appel vidéo */}
      <CallInvitationModal
        isModalOpen={isModalOpen}
        onAccept={() => {
          console.log('Call accepted (callee)');
          // Une fois l'appel accepté, on notifie le serveur et on démarre l'appel vidéo.
          handleConnect(callerIdForCall, myID);
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
      {/* Affichage de la carte avec les utilisateurs connectés */}
      <Map users={mapUsers} />
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
                      <p>Accéleration: {user.speed !== undefined ?
                        `${user.speed.toFixed(2)} km/h` :
                        <span>{!isSupported ? 'Accéléromètre non supporté sur cet appareil' : '0 km/h'}</span>
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
                      <p>Accéleration: {user.speed !== undefined ?
                        `${user.speed.toFixed(2)} km/h` :
                        <span>{!isSupported ? 'Accéléromètre non supporté sur cet appareil' : '0 km/h'}</span>
                      }</p>
                    </div>
                  </div>
                </li>
              )
            ))}
          </ul>
        </div>
        {/* Section de débuggage pour afficher en temps réel les données de l'accéléromètre */}
        <div className="mt-8 p-4 border border-gray-300">
          <h2 className="text-xl font-bold">Live Accelerometer Data</h2>
          <p><strong>Speed:</strong> {speed}</p>
          <p><strong>Supported:</strong> {isSupported ? "Yes" : "No"}</p>
          <p><strong>Permission Status:</strong> {permissionStatus}</p>
          <button onClick={requestPermission} className="mt-2 bg-green-500 text-white px-4 py-2 rounded">
            Request Permission
          </button>
        </div>
      </section>

      {/* Affiche l'appel vidéo dès qu'il est établi */}
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