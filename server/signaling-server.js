// Simple WebSocket signaling server for screen sharing
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3001 });

let clientSocket = null;
let hostSocket = null;

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (e) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
            return;
        }

        if (data.role === 'client') {
            clientSocket = ws;
            ws.role = 'client';
            if (hostSocket) hostSocket.send(JSON.stringify({ type: 'notify', message: 'Client wants to share screen' }));
        } else if (data.role === 'host') {
            hostSocket = ws;
            ws.role = 'host';
        }

        // Relay signaling messages
        if (data.type === 'signal') {
            if (ws.role === 'client' && hostSocket) hostSocket.send(JSON.stringify(data));
            if (ws.role === 'host' && clientSocket) clientSocket.send(JSON.stringify(data));
        }
        // Host accept/reject
        if (data.type === 'accept' && ws.role === 'host' && clientSocket) {
            clientSocket.send(JSON.stringify({ type: 'accept' }));
        }
        if (data.type === 'reject' && ws.role === 'host' && clientSocket) {
            clientSocket.send(JSON.stringify({ type: 'reject' }));
        }
        // Stop sharing
        if (data.type === 'stop' && ws.role === 'client' && hostSocket) {
            hostSocket.send(JSON.stringify({ type: 'stop' }));
        }
    });

    ws.on('close', () => {
        if (ws.role === 'client') clientSocket = null;
        if (ws.role === 'host') hostSocket = null;
    });
});

console.log('WebSocket signaling server running on ws://localhost:3001');
