// VideoCall.tsx
import React, { useRef, useEffect, useState } from 'react';

interface VideoCallProps {
    socket: WebSocket;
    myID: string;
    remoteId: string;
    role: 'caller' | 'callee';
}

const VideoCall: React.FC<VideoCallProps> = ({ socket, myID, remoteId, role }) => {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        console.log("[VideoCall] Création de la RTCPeerConnection");
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                // Ajoutez ici une configuration TURN si nécessaire
                // { urls: 'turn:YOUR_TURN_SERVER', username: 'user', credential: 'pass' }
            ]
        });
        pcRef.current = pc;

        // Suivi de l'état de la connexion WebRTC
        pc.onconnectionstatechange = () => {
            console.log("[VideoCall] État de la connexion :", pc.connectionState);
        };

        // Gestion des ICE candidates
        pc.onicecandidate = event => {
            if (event.candidate) {
                console.log("[VideoCall] Envoi d'une ICE candidate", event.candidate);
                socket.send(JSON.stringify({
                    action: "webrtc-ice",
                    candidate: event.candidate,
                    target: remoteId,
                    source: myID // Identification de l'expéditeur
                }));
            }
        };

        // Lorsqu'une piste distante est reçue, on l'affiche dans la balise vidéo
        pc.ontrack = event => {
            console.log("[VideoCall] Piste distante reçue", event.streams);
            if (remoteVideoRef.current && event.streams && event.streams[0]) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        // Récupération du flux local (vidéo et audio)
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(stream => {
                console.log("[VideoCall] Flux local obtenu");
                setLocalStream(stream);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
                // Ajout des pistes locales au PeerConnection
                stream.getTracks().forEach(track => pc.addTrack(track, stream));
            })
            .catch(error => {
                console.error("[VideoCall] Erreur lors de l'accès aux médias", error);
            });

        // Nettoyage lors de la fermeture du composant
        return () => {
            console.log("[VideoCall] Fermeture de la connexion");
            pc.close();
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
        };
    }, [socket, remoteId, myID]);

    useEffect(() => {
        if (!socket || !pcRef.current) return;
        const pc = pcRef.current;

        const handleSocketMessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                console.log("[VideoCall] Message reçu :", data);

                // Traitement de l'offre reçue par le callee
                if (data.action === "webrtc-offer" && data.source === remoteId) {
                    console.log("[VideoCall] Offre reçue du remoteId :", remoteId);
                    // Vérification que le flux local est bien disponible
                    if (!localStream) {
                        console.warn("[VideoCall] Flux local non disponible, attente de 1 seconde...");
                        setTimeout(() => handleSocketMessage(event), 1000);
                        return;
                    }
                    pc.setRemoteDescription(new RTCSessionDescription(data.offer))
                        .then(() => pc.createAnswer())
                        .then(answer => pc.setLocalDescription(answer).then(() => answer))
                        .then(answer => {
                            console.log("[VideoCall] Envoi de la réponse (answer)");
                            socket.send(JSON.stringify({
                                action: "webrtc-answer",
                                answer: answer,
                                target: remoteId,
                                source: myID // Ajout de source pour la réponse
                            }));
                        })
                        .catch(err => console.error("[VideoCall] Erreur lors du traitement de l'offre :", err));
                }
                // Traitement de la réponse reçue par le caller
                else if (data.action === "webrtc-answer" && data.source === remoteId) {
                    console.log("[VideoCall] Réponse reçue du remoteId :", remoteId);
                    pc.setRemoteDescription(new RTCSessionDescription(data.answer))
                        .catch(err => console.error("[VideoCall] Erreur lors de la définition de la remote description :", err));
                }
                // Traitement des ICE candidates reçues
                else if (data.action === "webrtc-ice" && data.source === remoteId) {
                    console.log("[VideoCall] ICE candidate reçue du remoteId :", remoteId);
                    pc.addIceCandidate(new RTCIceCandidate(data.candidate))
                        .catch(err => console.error("[VideoCall] Erreur lors de l'ajout de l'ICE candidate :", err));
                }
            } catch (err) {
                console.error("[VideoCall] Erreur lors du traitement du message WebSocket :", err);
            }
        };

        socket.addEventListener("message", handleSocketMessage);

        // Si l'utilisateur est le caller, on crée et envoie l'offre
        if (role === "caller") {
            const offerTimeout = setTimeout(() => {
                console.log("[VideoCall] Création de l'offre par le caller");
                pc.createOffer()
                    .then(offer => pc.setLocalDescription(offer))
                    .then(() => {
                        if (pc.localDescription) {
                            console.log("[VideoCall] Envoi de l'offre au remoteId :", remoteId);
                            socket.send(JSON.stringify({
                                action: "webrtc-offer",
                                offer: pc.localDescription,
                                target: remoteId,
                                source: myID
                            }));
                        }
                    })
                    .catch(err => console.error("[VideoCall] Erreur lors de la création de l'offre :", err));
            }, 1500); // Délai pour s'assurer que le flux local est prêt

            return () => clearTimeout(offerTimeout);
        }

        return () => {
            socket.removeEventListener("message", handleSocketMessage);
        };
    }, [socket, remoteId, role, myID, localStream]);

    return (
        <div className="video-call bg-white p-4 rounded shadow-lg">
            <h2 className="text-xl mb-2">Appel en cours...</h2>
            <div className="flex gap-4">
                <div>
                    <p>Votre vidéo :</p>
                    <video ref={localVideoRef} autoPlay muted style={{ width: "200px", border: "1px solid #000" }} />
                </div>
                <div>
                    <p>Vidéo distante :</p>
                    <video ref={remoteVideoRef} autoPlay style={{ width: "400px", border: "1px solid #000" }} />
                </div>
            </div>
        </div>
    );
};

export default VideoCall;
