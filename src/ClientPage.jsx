import React, { useRef, useState } from 'react';

// const SIGNAL_URL = 'ws://localhost:3001';
const SIGNAL_URL = 'wss://sharescreen-2xe9.onrender.com';

const ClientPage = () => {
    const videoRef = useRef(null);
    const wsRef = useRef(null);
    const pcRef = useRef(null);
    const streamRef = useRef(null);
    const [sharing, setSharing] = useState(false);
    const [waiting, setWaiting] = useState(false);
    const [error, setError] = useState(null);
    const [hostAccepted, setHostAccepted] = useState(false);
    const [hostRejected, setHostRejected] = useState(false);

    // Connect to signaling server
    React.useEffect(() => {
        const ws = new window.WebSocket(SIGNAL_URL);
        wsRef.current = ws;
        ws.onopen = () => {
            ws.send(JSON.stringify({ role: 'client' }));
        };
        ws.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'accept') {
                setHostAccepted(true);
                setHostRejected(false);
                await startWebRTC();
            } else if (data.type === 'reject') {
                setHostRejected(true);
                setHostAccepted(false);
                setWaiting(false);
            } else if (data.type === 'signal') {
                if (!pcRef.current) {
                    // Ignore signaling messages until peer connection is created
                    return;
                }
                if (data.sdp) {
                    try {
                        await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
                    } catch (err) {
                        setError('Failed to set remote description: ' + err.message);
                    }
                }
                if (data.candidate) {
                    try {
                        await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
                    } catch (err) {
                        setError('Failed to add ICE candidate: ' + err.message);
                    }
                }
            } else if (data.type === 'stop') {
                stopScreenShare();
            }
        };
        ws.onerror = (e) => setError('WebSocket error');
        ws.onclose = () => setError('WebSocket closed');
        return () => ws.close();
    }, []);

    const requestShare = () => {
        setWaiting(true);
        setHostAccepted(false);
        setHostRejected(false);
        wsRef.current.send(JSON.stringify({ type: 'notify', role: 'client' }));
    };

    const startWebRTC = async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setSharing(true);
            setWaiting(false);
            // Ensure previous connection is closed
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }
            const pc = new RTCPeerConnection();
            pcRef.current = pc;
            stream.getTracks().forEach((track) => pc.addTrack(track, stream));
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    wsRef.current.send(JSON.stringify({ type: 'signal', candidate: event.candidate, role: 'client' }));
                }
            };
            // Wait for negotiationneeded event before creating offer
            pc.onnegotiationneeded = async () => {
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    wsRef.current.send(JSON.stringify({ type: 'signal', sdp: offer, role: 'client' }));
                } catch (err) {
                    setError('Negotiation failed: ' + err.message);
                }
            };
            stream.getVideoTracks()[0].addEventListener('ended', stopScreenShare);
        } catch (err) {
            setError('Screen sharing failed: ' + err.message);
            setSharing(false);
            setWaiting(false);
        }
    };

    const stopScreenShare = () => {
        setSharing(false);
        setWaiting(false);
        setHostAccepted(false);
        setHostRejected(false);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        wsRef.current && wsRef.current.send(JSON.stringify({ type: 'stop', role: 'client' }));
    };

    return (
        <div>
            <h2>Client: Share Your Screen</h2>
            {!sharing && !waiting && (
                <button onClick={requestShare}>Request to Share Screen</button>
            )}
            {waiting && <div>Waiting for host to accept...</div>}
            {hostRejected && <div style={{ color: 'red' }}>Host rejected your request.</div>}
            {hostAccepted && sharing && (
                <button onClick={stopScreenShare}>Stop Sharing</button>
            )}
            {error && <div style={{ color: 'red' }}>{error}</div>}
            <div style={{ marginTop: 20 }}>
                <video ref={videoRef} autoPlay playsInline style={{ width: '80%', border: '1px solid #ccc' }} />
            </div>
        </div>
    );
};

export default ClientPage;
