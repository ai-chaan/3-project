# 🤖 AI Facilitator プロジェクト 引き継ぎ資料 (Handover Document)

本資料は、次期担当のAIアシスタントおよび開発者がプロジェクトの全体像を即座に把握し、迷わず機能追加・バグ修正・リファクタリングに着手できるようにまとめた完全引き継ぎ仕様書です。

---

## 1. プロジェクト概要

- **プロジェクト名**: AI Facilitator（チームファシリテーター / 3-project）
- **リポジトリ**: `https://github.com/ai-chaan/3-project.git`
- **公開URL (GitHub Pages)**: `https://ai-chaan.github.io/3-project/`
- **管理ダッシュボードURL**: `https://ai-chaan.github.io/3-project/dashboard_for_ai_facilitator.html`
- **開発目的**: ゼミ（大学3年ゼミ）の研究プロジェクト。複数人での対面/オンライン議論において、参加者の発話バランスや視線の向き、孤立状態をWebカメラ・マイクからリアルタイムに自動判定し、AIが個別にアドバイスを提供して全員が参加できる議論を支援する。
- **特徴**: サーバーへの重い映像・音声ストリーミングを行わず、**各端末のブラウザ上でエッジAI処理（MediaPipe）と音声解析を実行**し、軽量なステータスメタデータのみをPeerJS（WebRTC）でP2P相互通信する省帯域・低遅延設計。

---

## 2. ディレクトリ構成と主要ファイル一覧

```
.
├── index.html                           # メインアプリケーション（親機・子機兼用、視線・発話検知、P2P同期、リアルタイム集計）
├── dashboard_for_ai_facilitator.html   # 管理者/ファシリテーター用 リアルタイム会話分析ダッシュボード (Chart.js + Tailwind)
├── server.js                            # ローカル開発用PeerJSシグナリングサーバー (Node.js / peer)
├── package.json                         # 依存関係定義 (peer, ws)
├── package-lock.json
├── HANDOVER.md                          # 本引き継ぎ資料
├── .nojekyll                            # GitHub PagesでJekyll処理を無効化し_ファイル等を保護
└── .github/
    └── workflows/                       # 各種自動化ワークフロー
```

### 主要ファイルの責務

| ファイル名 | 役割・責務 |
| :--- | :--- |
| **`index.html`** | 参加者が開くメインUI。親機（Host）または子機（Guest）として動作。<br>・座席設定（ドラッグ配置と子機への自動同期）<br>・MediaPipe FaceMeshによる視線推定（鼻・顔の端の座標）<br>・マイク音量＋口元変形ベクトルによる厳密な発話検知<br>・PeerJSによるP2Pメッシュ/スター型データ通信<br>・各参加者への個別アドバイス送信＆「寂しいよ」アラート<br>・リアルタイム集計テーブル＆CSVエクスポート |
| **`dashboard_for_ai_facilitator.html`** | ファシリテーター/研究者向けの大画面モニターUI。<br>ホストのルームコードを入力してP2P接続し、全員の発話時間グラフ（棒グラフ）、発話シェア（ドーナツグラフ）、視線・被注視数一覧、イベント履歴を常時モニタリング。CSVダウンロード機能付き。 |
| **`server.js`** | ローカル開発・検証用の簡易PeerJSシグナリングサーバー（ポート9000、パス `/peerjs`）。`localhost` / `127.0.0.1` でページを開いたときのみ接続先になります。本番（GitHub Pages）ではパブリックなPeerJSクラウドサーバー（0.peerjs.com）を利用。 |

---

## 3. システムアーキテクチャ & 通信プロトコル

### 3.1 P2Pネットワークトポロジー (PeerJS / WebRTC)

- **親機（ホスト）**:
  - ルームコード（4文字のランダム英数字、例: `ABCD`）を発行。
  - Peer IDは `room-${activeRoomCode}` として登録。
  - 全ゲストからの接続を一元管理するハブ（スター型の中心）として機能。
- **子機（ゲスト）**:
  - ルームコードを入力してホスト（`room-ABCD`）に接続。
  - ホストから座席情報（`masterSeats`）を受信し、自分の名前を選択して参加。
- **通信メッセージ一覧**:

| メッセージ type | 送信元 ➜ 送信先 | ペイロード内容 | 説明 |
| :--- | :--- | :--- | :--- |
| `room_seats_sync` | ホスト ➜ ゲスト | `{ seats: masterSeats }` | 座席配置・名前一覧の同期 |
| `state_update` | 各端末 ➜ ホスト | `{ name, lookingAt, speaking, speakDuration, lookDuration }` | 500ms毎に送信される各参加者の最新ステータス |
| `personal_command` | ホスト ➜ 特定ゲスト | `{ message: "..." }` | その人のみに向けたAI個別アドバイス（他人の画面には表示されない） |
| `analysis_stats_sync` | ホスト ➜ ゲスト/ダッシュボード | `{ elapsedSeconds, cumulativeStats, users }` | 1秒毎の累積発話・会話時間同期 |
| `lonely_alert` | ゲスト ➜ ホスト ➜ 全員 | `{ fromPeerId }` | 「寂しいよ...」ボタン押下時の全画面オーバーレイ表示 |

---

## 4. コアアルゴリズム仕様

### 4.1 視線・顔の向き検知 (MediaPipe FaceMesh)
- **使用ランドマーク**:
  - 鼻先: インデックス `1`
  - 左顔端: インデックス `234`
  - 右顔端: インデックス `454`
- **判定手法**:
  $$\text{noseRelativeX} = \frac{\text{nose.x} - \text{rightEdge.x}}{\text{leftEdge.x} - \text{rightEdge.x}}$$
  感度補正（$2.5$倍）をかけた `currentFaceRatio`（$0.0 \sim 1.0$）を算出。
- **座席との幾何学的マッピング**:
  - 座席マップ（`seatMap`）上の自分の座席座標 $(x_1, y_1)$ と相手の座標 $(x_2, y_2)$ から角度 $\text{angle} = \text{atan2}(\Delta x, -\Delta y)$ を求め、ターゲット比率（$0.0 \sim 1.0$）を事前算出。
  - 最も比率の近い参加者を `currentLookTarget` として判定（閾値差分 $0.18$ 未満でターゲット名、それ以上離れたら「正面」）。

### 4.2 高精度発話検知（音量 ＋ 口元運動ベクトルのAND判定）
周囲の他人の発話音をマイクが拾った際の誤検知を防ぐため、**「マイク音量」と「唇の変形運動」の積集合（AND）**で判定。
- **マイク音量判定**: Web Audio API（AnalyserNode）平均音量 $> 35$ で `isAudioSpeaking = true`
- **口元運動量 (Articulation Motion Velocity)**:
  - 上唇 `13`, 下唇 `14`, 左口角 `61`, 右口角 `291` の4点座標を追跡。
  - 直前フレームとの移動距離合計 $\Delta \text{Upper} + \Delta \text{Lower} + \Delta \text{Left} + \Delta \text{Right}$ を算出。
  - 直近6フレームの平均移動量 `avgMotion > 0.012` かつ開口高 `mouthHeight > 0.022` の時のみ「言葉を発している動き」と認識。
- **笑顔判定との分離**:
  - 口角の引き上がり（`cornerLift`）と横幅拡大（`mouthWidth > 0.14`）を検出し、発話運動がなければ「笑顔（`isSmiling`）」として判定。

### 4.3 AIファシリテーション判定ルール（親機で毎秒実行）
1. **喋りすぎ (30秒以上)**: `speakDuration >= 30` ➜ 本人に話を振るよう促し、他者には発言を促す。
2. **特定者への注視固定 (30秒以上)**: `lookDuration >= 30 && lookingAt !== "正面"` ➜ 警告表示。
3. **孤立ユーザーの検知**: 「誰からも見られておらず、かつ自分も発言していない」ユーザーを特定 ➜ 本人および周囲に発言支援をアドバイス。
4. **健全バランス**: 問題がない場合は「✨ 全員が参加できていて、良いバランスです！」を表示。

---

## 5. Gitリポジトリ状況 & ブランチ構成

### 現在のブランチ状況
- **`main`**:
  - 最新コミット: `bf01ff7`（管理ダッシュボードを最新の会話分析・CSVエクスポート仕様に同期）
  - ローカル・リモート（`origin/main`）共に最新コミットに追従済み。未コミット差分なし。
- **`gh-pages`**:
  - 最新コミット: `bf01ff7`（`main` と完全同期してリモートへpush済み）。
  - GitHub Pagesの配信元ブランチ。
- **その他の過去ブランチ**:
  - `backup/local-work`: 渡邊藍氏による9月9日時点のバックアップブランチ（`index.html` およびオレンジ基調のデザインを試作した `index3.html` が存在）。
  - `feature/realtime-analysis-dashboard`: PR #2 で `main` にマージ済み。
  - `feature/p2p-refactor`: 過去のリファクタ作業ブランチ。

---

## 6. 直近の経緯とトラブルシューティング（重要）

### 「indexが古いものになっている」と報告された背景
1. **GitHub Pagesのビルド遅延とキャッシュ**:
   - `gh-pages` ブランチにプッシュしてから GitHub Pages 上に反映されるまでに2〜3分のビルド待機時間が生じます。
   - ブラウザのHTTPキャッシュが有効な場合、古いページ（`P2P完全修正版`）が表示され続けることがあります（**Cmd+Shift+R または Shift+リロード**で解消確認済み）。
2. **`backup/local-work` にある `index3.html` の存在**:
   - 過去にデザイン変更（暖色系・フォント改善）を施した `index3.html` が `backup/local-work` ブランチに保存されています。
   - もしユーザーが「以前変更したUIデザインや別のindex」を想定している場合は、`backup/local-work:index3.html` の内容を確認してください。
3. **コミット漏れの懸念**:
   - `git status` は完全に clean であり、未コミットのファイルはありません。ローカルの `index.html` には最新の分析テーブルやCSV機能がすべて含まれています。

---

## 7. 次のAIへ引き継ぐタスク / 改善推奨事項

1. **デザインUIのモダン化**:
   - 現在の `index.html` は標準CSSスタイルです。`dashboard_for_ai_facilitator.html`（Tailwind CSS）や `backup/local-work` にある `index3.html` のような洗練されたUI/UX（Tailwind CSS / フォント導入）への統一が期待されています。
2. **スマホ・タブレット対応 (レスポンシブ)**:
   - 会議参加者がスマートフォンから子機として参加しやすいよう、座席選択画面やビデオ小窓のモバイル最適化。
3. **LLM（Gemini API等）との連携拡張**:
   - 現在はルールベースのアドバイス（30秒超過、視線偏り等）ですが、Web Speech APIで音声をテキスト化し、Gemini APIに渡して議論内容に基づいたファシリテーションコメントを生成する拡張。
4. **座席マップの永続化 / ルーム設定保存**:
   - `localStorage` への座席配置保存。
