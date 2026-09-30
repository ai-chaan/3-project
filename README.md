# AI Facilitator（3-project）

複数人での議論において、Webカメラとマイクから発話バランス・視線の向き・孤立状態を各端末のブラウザ上で判定し、AIが個別にアドバイスを表示するファシリテーション支援ツールです。映像・音声は送信せず、軽量なステータスのみを PeerJS（WebRTC）でP2P共有します。

- 公開URL: https://ai-chaan.github.io/3-project/
- 管理ダッシュボード: https://ai-chaan.github.io/3-project/dashboard_for_ai_facilitator.html

## ファイル構成

| ファイル | 内容 |
| :--- | :--- |
| `index.html` | メインアプリ（親機・子機兼用） |
| `dashboard_for_ai_facilitator.html` | ファシリテーター向けリアルタイム会話分析ダッシュボード |
| `server.js` | ローカル開発用の PeerJS シグナリングサーバー（ポート9000） |
| `HANDOVER.md` | 詳細な仕様・通信プロトコル・引き継ぎメモ |

## ローカルで動かす

Node.js が必要です。

```bash
npm install
node server.js
```

`http://localhost:9000/peerjs` で PeerServer が起動します。別のターミナルで静的サーバーを立てて `index.html` を開いてください（カメラ・マイクの利用には `localhost` か HTTPS が必要です）。

```bash
python3 -m http.server 8000
# http://localhost:8000/index.html
```

`localhost` / `127.0.0.1` で開いた場合のみローカルの PeerServer に接続し、それ以外（GitHub Pages など）ではPeerJS公開クラウドサーバーを使います。

## 詳細

アーキテクチャ、通信メッセージ、検知アルゴリズムは [HANDOVER.md](HANDOVER.md) を参照してください。
