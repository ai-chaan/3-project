const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

console.log('WebSocket server is running on port 8080 (currently unused by PeerJS implementation)');

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        console.log('Received message:', message.toString());
    });
});