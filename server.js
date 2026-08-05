const { PeerServer } = require('peer');

const PORT = 9000;
const peerServer = PeerServer({
    port: PORT,
    path: '/peerjs',
    corsOptions: {
        origin: '*'
    }
});

console.log(`✅ Local PeerServer running on http://localhost:${PORT}/peerjs`);

peerServer.on('connection', (client) => {
    console.log('Client connected:', client.getId());
});

peerServer.on('disconnect', (client) => {
    console.log('Client disconnected:', client.getId());
});