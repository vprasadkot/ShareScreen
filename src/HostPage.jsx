import React, { useRef, useState, useEffect } from 'react';

const SIGNAL_URL = 'ws://localhost:3001';

const HostPage = () => {
    const videoRef = useRef(null);
    const wsRef = useRef(null);
    const pcRef = useRef(null);
    const [notified, setNotified] = useState(false);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(null);
    const [connecting, setConnecting] = useState(false);

    useEffect(() => {
        const ws = new window.WebSocket(SIGNAL_URL);
        wsRef.current = ws;
        ws.onopen = () => {
            ws.send(JSON.stringify({ role: 'host' }));
        };
        ws.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'notify') {
                setNotified(true);
                setConnecting(false);
            } else if (data.type === 'signal') {
                if (!pcRef.current) return;
                if (data.sdp) {
                    await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
                    if (data.sdp.type === 'offer') {
                        const answer = await pcRef.current.createAnswer();
                        await pcRef.current.setLocalDescription(answer);
                        wsRef.current.send(JSON.stringify({ type: 'signal', sdp: answer, role: 'host' }));
                    }
                }
                if (data.candidate) {
                    await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
                }
            } else if (data.type === 'stop') {
                stopViewing();
            }
        };
        ws.onerror = (e) => setError('WebSocket error');
        ws.onclose = () => setError('WebSocket closed');
        return () => ws.close();
    }, []);

    const acceptShare = () => {
        setConnecting(true);
        setNotified(false);
        wsRef.current.send(JSON.stringify({ type: 'accept', role: 'host' }));
        startWebRTC();
    };

    const rejectShare = () => {
        wsRef.current.send(JSON.stringify({ type: 'reject', role: 'host' }));
        setNotified(false);
    };

    const startWebRTC = () => {
        setError(null);
        const pc = new RTCPeerConnection();
        pcRef.current = pc;
        pc.ontrack = (event) => {
            if (videoRef.current) {
                videoRef.current.srcObject = event.streams[0];
            }
            setConnected(true);
        };
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                wsRef.current.send(JSON.stringify({ type: 'signal', candidate: event.candidate, role: 'host' }));
            }
        };
    };

    const stopViewing = () => {
        setConnected(false);
        setConnecting(false);
        setNotified(false);
        if (videoRef.current) videoRef.current.srcObject = null;
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
    };

    return (
        <div>
            <h2>Host/Agent: View Shared Screen</h2>
            {notified && !connected && !connecting && (
                <div>
                    <div>Client wants to share their screen.</div>
                    <button onClick={acceptShare}>Accept</button>
                    <button onClick={rejectShare}>Reject</button>
                </div>
            )}
            {connecting && <div>Connecting...</div>}
            {connected && (
                <div>
                    <button onClick={stopViewing}>Stop Viewing</button>
                </div>
            )}
            {error && <div style={{ color: 'red' }}>{error}</div>}
            <div style={{ marginTop: 20 }}>
                <video ref={videoRef} autoPlay playsInline controls style={{ width: '80%', border: '1px solid #ccc' }} />
            </div>
        </div>
    );
};

export default HostPage;
