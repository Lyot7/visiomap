"use client";
import CallInvitationModal from '@/components/CallInvitationModal';
import Map from "@/components/Map";
import VideoCall from '@/components/VideoCall';
import useAccelerometer from '@/hooks/useAccelerometer';
import useWebSocket, { User } from "@/hooks/useWebSocket";
import dotenv from "dotenv";
import { useCallback, useEffect, useRef, useState } from 'react';

dotenv.config();

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  // New state: mapUsers will only hold users when a new one is added.
  const [mapUsers, setMapUsers] = useState<User[]>([]);
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

  // For the caller: when "Appeler" is clicked, send a call invitation.
  const handleConnectRequest = (receiverId: string) => {
    console.log(`Calling user ${receiverId} from user ${myID}`);
    sendCallInvitation(myID, receiverId, users);
  };

  const handleCallEnded = useCallback(() => {
    console.log("Call ended");
    setCallData(null);
  }, []);

  // Throttle speed updates: send speed only if 500ms has passed since the last update.
  const lastSpeedUpdateRef = useRef<number>(0);
  const THROTTLE_INTERVAL = 500; // 500ms throttle interval

  const handleSpeedChange = useCallback(
    (newSpeed: number) => {
      const now = Date.now();
      if (now - lastSpeedUpdateRef.current >= THROTTLE_INTERVAL) {
        console.log("Sending speed update:", newSpeed);
        sendSpeed(newSpeed);
        lastSpeedUpdateRef.current = now;
      } else {
        console.warn("Skipping speed update: throttled");
      }
    },
    [sendSpeed]
  );

  // Capture accelerometer values using the hook. Note that it calls `handleSpeedChange`.
  const { speed, isSupported, permissionStatus, requestPermission } = useAccelerometer(handleSpeedChange);

  // Listen for call end events on the socket.
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

  // Update `mapUsers` only when a new user connects.
  useEffect(() => {
    setMapUsers((prevMapUsers) => {
      const newUsers = users.filter(user => !prevMapUsers.some(existingUser => existingUser.id === user.id));
      return newUsers.length > 0 ? [...prevMapUsers, ...newUsers] : prevMapUsers;
    });
  }, [users]);

  return (
    <main className="flex min-h-screen flex-row items-center justify-between px-24 py-12 gap-8 h-screen">
      <CallInvitationModal
        isModalOpen={isModalOpen}
        onAccept={() => {
          console.log('Call accepted (callee)');
          // For the callee: notify the server via "connect", then start the video call.
          handleConnect(callerIdForCall, myID);
          // Specify role as callee and the peer's ID.
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
      {/* Updated Map component to use mapUsers so that the map is only updated when new users are added */}
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
                      <p>Vitesse: {user.speed !== undefined ?
                        `${user.speed.toFixed(2)} m/s²` :
                        "Données de l'accélérateur non disponibles sur cet appareil"
                      }</p>
                    </div>
                  </div>
                </li>
              ) : (
                <li key={index} className="mb-4">
                  <div className="flex flex-col">
                    <h3 className="text-2xl mr-2">Moi</h3>
                    <div className="text-xl">
                      <p>Position: {user.coordinates.lat}, {user.coordinates.lng}</p>
                      <p>Vitesse: {user.speed !== undefined ?
                        `${user.speed.toFixed(2)} m/s²` :
                        "Données de l'accélérateur non disponibles sur cet appareil"
                      }</p>
                    </div>
                  </div>
                </li>
              )
            ))}
          </ul>
        </div>
        {/* Debug section to show accelerometer hook data */}
        <div className="mt-8 p-4 border border-gray-300">
          <h2 className="text-xl font-bold">Accelerometer Data</h2>
          <p><strong>Speed:</strong> {speed}</p>
          <p><strong>Supported:</strong> {isSupported ? "Yes" : "No"}</p>
          <p><strong>Permission Status:</strong> {permissionStatus}</p>
          <button onClick={requestPermission} className="mt-2 bg-green-500 text-white px-4 py-2 rounded">
            Request Permission
          </button>
        </div>
      </section>

      {/* When a call is established, display the video call */}
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