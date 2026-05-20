// server.js
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

// 接続している全ユーザーのステータスを保持
let userStates = {};

wss.on('connection', (ws) => {
    console.log('新しいクライアントが接続しました。');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            // ユーザーの状態を更新 (名前, 見ている方向, 発言中か, 話しすぎか等が含まれる)
            userStates[data.name] = data;

            // 全員に最新のネットワーク状況を送信
            const networkStatus = Object.values(userStates);
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(networkStatus));
                }
            });
        } catch (e) {
            console.error("データ解析エラー:", e);
        }
    });

    ws.on('close', () => {
        console.log('クライアントが切断されました。');
    });
});

console.log('WebSocketサーバーがポート8080で起動しました...');