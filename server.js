const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

// ルームごとのデータを保持するオブジェクト
// 構造: { "ABCD": { clients: Set(接続者たち), states: { Aさん: {...}, Bさん: {...} } } }
const rooms = {};

wss.on('connection', (ws) => {
    console.log('新しいクライアントが接続しました。');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            // 1. ルームへの参加処理
            if (data.type === 'join_room') {
                const roomCode = data.roomCode;
                ws.roomCode = roomCode; // この接続がどの部屋に属しているか記憶
                ws.userName = data.name;

                // 部屋が存在しなければ作成
                if (!rooms[roomCode]) {
                    rooms[roomCode] = { clients: new Set(), states: {} };
                    console.log(`ルーム作成: ${roomCode}`);
                }
                
                rooms[roomCode].clients.add(ws);
                console.log(`${data.name} がルーム ${roomCode} に参加しました`);
                return;
            }

            // ルームに参加していないメッセージは無視
            if (!ws.roomCode || !rooms[ws.roomCode]) return;

            const room = rooms[ws.roomCode];

            // 2. 状態のアップデートと部屋内への共有
            if (data.type === 'state_update') {
                room.states[data.name] = data.payload;
                
                // 同じ部屋の全員に送信
                broadcastToRoom(ws.roomCode, {
                    type: 'network_status',
                    data: Object.values(room.states)
                });
            } 
            // 3. 親機からの指示や、寂しいよアラートを部屋内へ共有
            else if (data.type === 'parent_command' || data.type === 'lonely_alert') {
                broadcastToRoom(ws.roomCode, data);
            }

        } catch (e) {
            console.error("データ解析エラー:", e);
        }
    });

    // 接続が切れたときの処理
    ws.on('close', () => {
        if (ws.roomCode && rooms[ws.roomCode]) {
            const room = rooms[ws.roomCode];
            room.clients.delete(ws); // 接続リストから削除
            
            if (ws.userName) {
                delete room.states[ws.userName]; // 状態リストからも削除
                console.log(`${ws.userName} がルーム ${ws.roomCode} から退出しました`);
                
                // 残ったメンバーに最新状態を共有
                broadcastToRoom(ws.roomCode, {
                    type: 'network_status',
                    data: Object.values(room.states)
                });
            }

            // 誰もいなくなったら部屋を削除
            if (room.clients.size === 0) {
                delete rooms[ws.roomCode];
                console.log(`ルーム ${ws.roomCode} を削除しました`);
            }
        }
    });
});

// 指定したルームの全員にメッセージを送る関数
function broadcastToRoom(roomCode, messageObj) {
    if (!rooms[roomCode]) return;
    const msgString = JSON.stringify(messageObj);
    rooms[roomCode].clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msgString);
        }
    });
}

console.log('WebSocketサーバーがポート8080で起動しました...');