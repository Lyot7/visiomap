import React, { useCallback, useEffect, useRef } from 'react';

interface WebRTCOfferMessage {
    action: "webrtc-offer";
    source: string;
    offer: RTCSessionDescriptionInit;
}

interface WebRTCAnswerMessage {
    action: "webrtc-answer";
    source: string;
    answer: RTCSessionDescriptionInit;
}

interface WebRTCIceMessage {
    action: "webrtc-ice";
    source: string;
    candidate: RTCIceCandidateInit;
}

type WebRTCMessage = WebRTCOfferMessage | WebRTCAnswerMessage | WebRTCIceMessage;

interface VideoCallProps {
    socket: WebSocket;
    myID: string;
    remoteId: string;
    role: 'caller' | 'callee';
    onCallEnded: () => void;
}

// Composant pour gérer un appel vidéo via la technologie WebRTC.
const VideoCall: React.FC<VideoCallProps> = ({ socket, myID, remoteId, role, onCallEnded }) => {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);

    // Référence pour le flux média local
    const localStreamRef = useRef<MediaStream | null>(null);
    // Stocke temporairement une offre entrante si le flux local n'est pas encore prêt
    const pendingOfferRef = useRef<WebRTCOfferMessage | null>(null);

    // Fonction permettant de traiter une offre WebRTC entrante
    const handleOffer = useCallback((offerData: WebRTCOfferMessage): void => {
        if (!pcRef.current) return;
        const pc = pcRef.current;
        pc.setRemoteDescription(new RTCSessionDescription(offerData.offer))
            .then(() => pc.createAnswer())
            .then((answer) => pc.setLocalDescription(answer).then(() => answer))
            .then((answer) => {
                console.log("[VideoCall] Sending answer");
                socket.send(
                    JSON.stringify({
                        action: "webrtc-answer",
                        answer: answer,
                        target: remoteId,
                        source: myID,
                    })
                );
            })
            .catch((err) =>
                console.error("[VideoCall] Error handling offer:", err)
            );
    }, [socket, remoteId, myID]);

    // Création de la connexion WebRTC et obtention du flux média local
    useEffect(() => {
        console.log("[VideoCall] Creating RTCPeerConnection");
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ]
        });
        pcRef.current = pc;

        // Lorsqu'une négociation est nécessaire (uniquement pour le caller)
        pc.onnegotiationneeded = () => {
            console.log("[VideoCall] Negotiation needed");
            if (role === "caller") {
                console.log("[VideoCall] Creating offer as caller");
                pc.createOffer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: true
                })
                    .then((offer) => {
                        console.log("[VideoCall] Setting local description");
                        return pc.setLocalDescription(offer);
                    })
                    .then(() => {
                        if (pc.localDescription) {
                            console.log("[VideoCall] Sending offer");
                            socket.send(
                                JSON.stringify({
                                    action: "webrtc-offer",
                                    offer: pc.localDescription,
                                    target: remoteId,
                                    source: myID,
                                })
                            );
                        }
                    })
                    .catch((err) =>
                        console.error("[VideoCall] Error creating offer:", err)
                    );
            }
        };

        pc.onconnectionstatechange = () => {
            console.log("[VideoCall] Connection State:", pc.connectionState);
        };

        // Envoi des candidats ICE au pair via le serveur (WebSocket)
        pc.onicecandidate = event => {
            if (event.candidate) {
                console.log("[VideoCall] Sending ICE candidate", event.candidate);
                socket.send(
                    JSON.stringify({
                        action: "webrtc-ice",
                        candidate: event.candidate,
                        target: remoteId,
                        source: myID,
                    })
                );
            }
        };

        // Réception du flux distant et attribution à l'élément vidéo dédié
        pc.ontrack = event => {
            console.log("[VideoCall] Remote track received", {
                kind: event.track.kind,
                trackId: event.track.id,
                streamId: event.streams[0]?.id
            });

            const [remoteStream] = event.streams;
            if (!remoteStream) {
                console.error("[VideoCall] No remote stream in track event");
                return;
            }

            if (remoteVideoRef.current) {
                console.log("[VideoCall] Setting remote stream to video element");
                remoteVideoRef.current.srcObject = remoteStream;
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log("[VideoCall] ICE Connection State:", pc.iceConnectionState);
        };

        pc.onsignalingstatechange = () => {
            console.log("[VideoCall] Signaling State:", pc.signalingState);
        };

        // Obtention du flux média local (vidéo et audio)
        navigator.mediaDevices
            .getUserMedia({ video: true, audio: true })
            .then((stream) => {
                console.log("[VideoCall] Local stream obtained with tracks:",
                    stream.getTracks().map(t => t.kind));
                localStreamRef.current = stream;

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }

                // Ajoute chaque piste du flux local à la connexion RTCPeerConnection
                stream.getTracks().forEach((track) => {
                    console.log("[VideoCall] Adding track to peer connection:", track.kind);
                    pc.addTrack(track, stream);
                });

                // Si une offre était en attente, la traiter ici
                if (pendingOfferRef.current) {
                    console.log("[VideoCall] Processing pending offer");
                    handleOffer(pendingOfferRef.current);
                    pendingOfferRef.current = null;
                }
            })
            .catch((error) => {
                console.error("[VideoCall] Error accessing local media", error);
            });

        return () => {
            console.log("[VideoCall] Closing connection");
            pc.close();
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach((track) => track.stop());
            }
        };
    }, [socket, remoteId, myID, handleOffer, role]);

    // Gestion des messages WebSocket relatifs à WebRTC (offres, réponses, candidats ICE)
    useEffect(() => {
        if (!socket || !pcRef.current) return;

        const handleSocketMessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data) as WebRTCMessage;
                console.log("[VideoCall] Message received:", data);

                if (data.action === "webrtc-offer" && data.source === remoteId) {
                    console.log("[VideoCall] Processing offer from:", remoteId);
                    if (!localStreamRef.current) {
                        console.warn("[VideoCall] Local stream not ready, storing offer");
                        pendingOfferRef.current = data;
                    } else {
                        handleOffer(data);
                    }
                } else if (data.action === "webrtc-answer" && data.source === remoteId) {
                    console.log("[VideoCall] Processing answer from:", remoteId);
                    if (!pcRef.current) return;
                    pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer))
                        .catch(err => console.error("[VideoCall] Error setting remote description:", err));
                } else if (data.action === "webrtc-ice" && data.source === remoteId) {
                    console.log("[VideoCall] Processing ICE candidate from:", remoteId);
                    if (!pcRef.current) return;
                    pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate))
                        .catch(err => console.error("[VideoCall] Error adding ICE candidate:", err));
                }
            } catch (err) {
                console.error("[VideoCall] Error processing message:", err);
            }
        };

        socket.addEventListener("message", handleSocketMessage);
        return () => socket.removeEventListener("message", handleSocketMessage);
    }, [socket, remoteId, myID, handleOffer]);

    // Fonction pour raccrocher l'appel, fermer la connexion et notifier le serveur
    const handleHangup = useCallback(() => {
        console.log("[VideoCall] Hanging up");
        if (pcRef.current) {
            pcRef.current.close();
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
        }
        // Notifie le serveur de la fin d'appel
        socket.send(JSON.stringify({
            action: "hangup",
            target: remoteId,
            source: myID
        }));
        onCallEnded();
    }, [socket, remoteId, myID, onCallEnded]);

    // Ecoute des messages de fin d'appel provenant du serveur (fin de communication par le pair)
    useEffect(() => {
        if (!socket) return;

        const handleSocketMessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "call-ended") {
                    console.log("[VideoCall] Call ended by remote peer");
                    handleHangup();
                }
            } catch (err) {
                console.error("[VideoCall] Error processing message:", err);
            }
        };

        socket.addEventListener("message", handleSocketMessage);
        return () => socket.removeEventListener("message", handleSocketMessage);
    }, [socket, handleHangup]);

    return (
        <div className="video-call bg-white dark:bg-gray-800 p-4 rounded shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl">Appel en cours...</h2>
                <button
                    onClick={handleHangup}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                >
                    Raccrocher
                </button>
            </div>
            <div className="flex gap-4">
                <div>
                    <p>Votre vidéo :</p>
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ width: "200px", border: "1px solid #000" }}
                    />
                </div>
                <div>
                    <p>Vidéo distante :</p>
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        style={{ width: "400px", border: "1px solid #000" }}
                    />
                </div>
            </div>
        </div>
    );
};

export default VideoCall;