// VideoCall.tsx
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
}

const VideoCall: React.FC<VideoCallProps> = ({ socket, myID, remoteId, role }) => {
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);

    // Use refs for a stable, non-reactive reference.
    const localStreamRef = useRef<MediaStream | null>(null);
    // This ref holds an offer if it arrives before the local stream is ready.
    const pendingOfferRef = useRef<WebRTCOfferMessage | null>(null);

    // Helper to process an incoming offer.
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

    // Create the RTCPeerConnection and obtain local media.
    useEffect(() => {
        console.log("[VideoCall] Creating RTCPeerConnection");
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        pcRef.current = pc;

        pc.onconnectionstatechange = () => {
            console.log("[VideoCall] Connection state:", pc.connectionState);
        };

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

        pc.ontrack = event => {
            console.log("[VideoCall] Remote track received", event.streams);
            if (remoteVideoRef.current && event.streams[0]) {
                remoteVideoRef.current.srcObject = event.streams[0];
                remoteVideoRef.current.play().catch(err =>
                    console.error("[VideoCall] Error playing remote video:", err)
                );
            }
        };

        // Get local media and then check for any pending offer.
        navigator.mediaDevices
            .getUserMedia({ video: true, audio: true })
            .then((stream) => {
                console.log("[VideoCall] Local stream obtained");
                localStreamRef.current = stream;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
                stream.getTracks().forEach((track) => pc.addTrack(track, stream));
                // If an offer came in before the stream was ready, process it now.
                if (pendingOfferRef.current) {
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
    }, [socket, remoteId, myID, handleOffer]);

    // WebSocket message handler.
    useEffect(() => {
        if (!socket || !pcRef.current) return;
        const pc = pcRef.current;

        const handleSocketMessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data) as WebRTCMessage;
                console.log("[VideoCall] Message received:", data);
                if (data.action === "webrtc-offer" && data.source === remoteId) {
                    console.log("[VideoCall] Offer received from remoteId:", remoteId);
                    if (!localStreamRef.current) {
                        console.warn(
                            "[VideoCall] Local stream not available, storing pending offer"
                        );
                        pendingOfferRef.current = data;
                    } else {
                        handleOffer(data);
                    }
                } else if (data.action === "webrtc-answer" && data.source === remoteId) {
                    console.log("[VideoCall] Answer received from remoteId:", remoteId);
                    pc.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(
                        (err) =>
                            console.error(
                                "[VideoCall] Error setting remote description:",
                                err
                            )
                    );
                } else if (data.action === "webrtc-ice" && data.source === remoteId) {
                    console.log("[VideoCall] ICE candidate received from remoteId:", remoteId);
                    pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch((err) =>
                        console.error("[VideoCall] Error adding ICE candidate:", err)
                    );
                }
            } catch (err) {
                console.error("[VideoCall] Error processing WebSocket message:", err);
            }
        };

        socket.addEventListener("message", handleSocketMessage);

        if (role === "caller") {
            const offerTimeout = setTimeout(() => {
                console.log("[VideoCall] Creating offer as caller");
                pc.createOffer()
                    .then((offer) => pc.setLocalDescription(offer))
                    .then(() => {
                        if (pc.localDescription) {
                            console.log("[VideoCall] Sending offer to remoteId:", remoteId);
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
            }, 1500);

            return () => clearTimeout(offerTimeout);
        }

        return () => {
            socket.removeEventListener("message", handleSocketMessage);
        };
    }, [socket, remoteId, role, myID, handleOffer]);

    return (
        <div className="video-call bg-white dark:bg-gray-800 p-4 rounded shadow-lg">
            <h2 className="text-xl mb-2">Appel en cours...</h2>
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
