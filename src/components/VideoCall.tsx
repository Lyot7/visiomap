// VideoCall.tsx
import React, { useRef, useEffect, useState } from 'react';

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
}

const VideoCall: React.FC<VideoCallProps> = ({ socket, myID, remoteId, role }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  
  // Use a ref for the local media stream so that we have a stable reference.
  const localStreamRef = useRef<MediaStream | null>(null);
  // Optionally, keep a state copy if you need to trigger re-renders.
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Create and configure the RTCPeerConnection and getUserMedia.
  useEffect(() => {
    console.log("[VideoCall] Création de la RTCPeerConnection");
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    pcRef.current = pc;

    // Monitor the connection state.
    pc.onconnectionstatechange = () => {
      console.log("[VideoCall] État de la connexion :", pc.connectionState);
    };

    // Handle ICE candidates.
    pc.onicecandidate = event => {
      if (event.candidate) {
        console.log("[VideoCall] Envoi d'une ICE candidate", event.candidate);
        socket.send(JSON.stringify({
          action: "webrtc-ice",
          candidate: event.candidate,
          target: remoteId,
          source: myID
        }));
      }
    };

    // When a remote track is received, assign it to the remote video element.
    pc.ontrack = event => {
      console.log("[VideoCall] Piste distante reçue", event.streams);
      if (remoteVideoRef.current && event.streams && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Get the local media stream.
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        console.log("[VideoCall] Flux local obtenu");
        localStreamRef.current = stream;
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        // Add local tracks to the PeerConnection.
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
      })
      .catch(error => {
        console.error("[VideoCall] Erreur lors de l'accès aux médias", error);
      });

    // Cleanup on unmount.
    return () => {
      console.log("[VideoCall] Fermeture de la connexion");
      pc.close();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [socket, remoteId, myID]);

  // Set up the WebSocket message handling.
  useEffect(() => {
    if (!socket || !pcRef.current) return;
    const pc = pcRef.current;

    // Helper to handle an offer.
    const handleOffer = (offerData: WebRTCOfferMessage): void => {
      // Use the stable ref value instead of state.
      if (!localStreamRef.current) {
        console.warn("[VideoCall] Flux local non disponible, attente de 1 seconde...");
        setTimeout(() => handleOffer(offerData), 1000);
        return;
      }
      pc.setRemoteDescription(new RTCSessionDescription(offerData.offer))
        .then(() => pc.createAnswer())
        .then(answer => pc.setLocalDescription(answer).then(() => answer))
        .then(answer => {
          console.log("[VideoCall] Envoi de la réponse (answer)");
          socket.send(JSON.stringify({
            action: "webrtc-answer",
            answer: answer,
            target: remoteId,
            source: myID
          }));
        })
        .catch(err => console.error("[VideoCall] Erreur lors du traitement de l'offre :", err));
    };

    // Message handler for WebSocket events.
    const handleSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as WebRTCMessage;
        console.log("[VideoCall] Message reçu :", data);

        if (data.action === "webrtc-offer" && data.source === remoteId) {
          console.log("[VideoCall] Offre reçue du remoteId :", remoteId);
          handleOffer(data);
        } else if (data.action === "webrtc-answer" && data.source === remoteId) {
          console.log("[VideoCall] Réponse reçue du remoteId :", remoteId);
          pc.setRemoteDescription(new RTCSessionDescription(data.answer))
            .catch(err => console.error("[VideoCall] Erreur lors de la définition de la remote description :", err));
        } else if (data.action === "webrtc-ice" && data.source === remoteId) {
          console.log("[VideoCall] ICE candidate reçue du remoteId :", remoteId);
          pc.addIceCandidate(new RTCIceCandidate(data.candidate))
            .catch(err => console.error("[VideoCall] Erreur lors de l'ajout de l'ICE candidate :", err));
        }
      } catch (err) {
        console.error("[VideoCall] Erreur lors du traitement du message WebSocket :", err);
      }
    };

    socket.addEventListener("message", handleSocketMessage);

    // If the user is the caller, create and send the offer.
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
      }, 1500);

      return () => clearTimeout(offerTimeout);
    }

    return () => {
      socket.removeEventListener("message", handleSocketMessage);
    };
  }, [socket, remoteId, role, myID]); // Notice: localStream is no longer in the dependency list

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
