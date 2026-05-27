// server.js
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

// 最新のユーザー状態を保持
let userStates = {};

wss.on('connection', (ws) => {
    console.log('新しいクライアントが接続しました。');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'state_update') {
                // 子機（または親機自身）からの状態アップデート
                userStates[data.name] = data.payload;
                
                // 全員に最新の全ユーザー状態を送信
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'network_status',
                            data: Object.values(userStates)
                        }));
                    }
                });
            } 
            else if (data.type === 'parent_command') {
                // 親機から発行された「特定の人への指示」や「全体アラート」を全員に中継
                wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(data));
                    }
                });
            }
        } catch (e) {
            console.error("データ解析エラー:", e);
        }
    });

    ws.on('close', () => {
        console.log('クライアントが切断されました。');
    });
});

console.log('WebSocketサーバーがポート8080で起動しました...');