# 試合マッチングアプリ 仕様書

---

## 1. 目的
草野球を中心に、アマチュアスポーツを楽しむ個人・チームが "対戦相手" や "足りないポジション" を効率良く見つけられる Web アプリを開発する。シンプルで使いやすい UI と、場所・日程・練度など複数条件を考慮したマッチングロジックを実装し、募集主と参加希望者をスムーズに繋げる。

## 2. 採用技術と役割
| レイヤ | 主な技術 | 役割 |
|--------|----------|------|
| **フロントエンド** | HTML / CSS / JavaScript (Vue 3 + Vite) | 画面表示・フォーム入力・リアルタイム更新・地図表示 (Leaflet + OpenStreetMap) |
| **バックエンド API** | Ruby 3.3 (Ruby on Rails 7) | REST / GraphQL API、JWT 認証 (Devise + devise‑jwt)、業務ロジック、データ永続化、通知 WebSocket (ActionCable) |
| **マッチング & バッチ** | Python 3.12 (FastAPI + Celery) | 条件スコアリング、推薦アルゴリズム、定時バッチで未マッチ案件を自動提案 |
| **DB** | PostgreSQL 16 | 永続データ (ユーザ・チーム・試合・募集・通知) |
| **メッセージ & 通知** | Redis Streams + ActionCable / FCM | リアルタイム通知・プッシュ通知 |
| **インフラ** | Docker Compose / Fly.io | CI/CD・コンテナ化・自動デプロイ |

---

## 3. 主要機能
### 3.1 試合募集機能 (Match Post)
| 項目 | 型 | 必須 | 説明 |
|------|----|------|------|
| 開催日時 | `datetime` | ✓ | 集合日時 (複数可) |
| 開催場所 | `string` | ✓ | 球場名 + 住所 + 地図座標 |
| 募集コメント | `text` |   | 備考やレギュレーション |
| 練度 (年数) | `integer` |   | 経験年数の目安 |
| スタイル | `enum`(`casual`,`competitive`) | ✓ | ガチ / カジュアル |
| チーム名 | `string` | ✓ | 募集主チーム名 |
| 上限チーム数 | `integer` | ✓ | 1 (対戦) or 2+ (ミニ大会) |

* **参加ボタン** … 応募すると `MatchJoinRequest` が生成され、募集主にリアルタイム通知。
* 募集主は応募を承認/拒否でき、承認時点でマッチ確定。

### 3.2 パーティ募集機能 (Position Recruit)
| 項目 | 型 | 必須 | 説明 |
|------|----|------|------|
| ポジション | `enum` (Pitcher, Catcher, …自由追加) | ✓ | 欠員ポジション |
| 必要人数 | `integer` | ✓ | 例: 1 |
| 募集コメント | `text` |   | 条件・希望レベルなど |
| 練度 | `integer` |   | 歓迎レベル |
| 試合リンク | `foreign_key -> Match` | ✓ | どの試合に参加するか |

* **参加ボタン** … 個人ユーザがポジション応募→ `RecruitJoinRequest` 作成→ チーム代表に通知。

### 3.3 検索 & フィルタ
* 日付、都道府県、距離 (Geo search)、練度、スタイル で絞り込み。
* リアルタイム更新 (Polling + WebSocket)。

### 3.4 通知
* WebSocket (ActionCable) + FCM でリアルタイム & Push。
* 未読バッジ、メールバックアップ通知。

---

## 4. 画面一覧 (主要ワイヤ) 
| ID | 画面名 | 概要 |
|----|--------|------|
| S1 | ダッシュボード | 自チーム募集・参加状況・通知一覧 |
| S2 | 試合募集一覧 | 地図 + カード表示、フィルタ UI |
| S3 | 試合募集詳細 | 募集内容詳細、参加ボタン、参加者リスト |
| S4 | 試合募集作成/編集 | フォーム (上記項目) |
| S5 | ポジション募集一覧 | 試合リンク付き一覧、応募ボタン |
| S6 | ポジション募集作成/編集 | 欠員登録フォーム |
| S7 | 承認管理 | 募集主用 承認/拒否ダイアログ |
| S8 | プロフィール & チーム管理 | チーム情報・実績・メンバー招待 |

---

## 5. ER 図 (概要)
```
User 1---N TeamMembership N---1 Team 1---N Match 1---N PositionRecruit
Match 1---N MatchJoinRequest (state: pending/approved/declined)
PositionRecruit 1---N RecruitJoinRequest (state: pending/approved/declined)
Notification (polymorphic: MatchJoinRequest / RecruitJoinRequest)
```

---

## 6. API エンドポイント (Rails)
| メソッド | URI | 説明 |
|----------|-----|------|
| GET | /matches | 募集一覧 (検索パラメータ) |
| POST | /matches | 募集作成 |
| GET | /matches/:id | 詳細取得 |
| POST | /matches/:id/join | 参加応募 |
| PATCH | /matches/:id/requests/:req_id | 募集主が承認/拒否 |
| POST | /matches/:id/recruits | 欠員募集作成 |
| POST | /recruits/:id/join | ポジション応募 |
| PATCH | /recruits/:id/requests/:req_id | 代表承認/拒否 |

---

## 7. マッチングロジック (Python)
```python
score = (date_similarity * 0.3 + location_distance_score * 0.3 + skill_gap * 0.2 + style_match * 0.2)
```
* Celery バッチで毎朝 06:00 に未マッチ投稿に対しレコメンド候補を作成し、メール/アプリ通知。

---

## 8. UI/UX 指針
* スマホ優先のレスポンシブ。
* 3タップ以内で応募完了。
* Leaflet で球場ピンをドロップ → 座標保存。
* プログレッシブ Web App (PWA) 対応: オフライン時はローカルキャッシュ、保留リクエストはオンライン復帰後同期。

---

## 9. セキュリティ & 運用
* CSRF / XSS 対策、強制 HTTPS。
* JWT + Refresh トークンリフレッシュ。
* RDB バックアップ (pg_dump) + S3 スナップショット。
* Sentry + Grafana で監視。

---

## 10. 開発フロー
1. 画面プロトタイプ (Figma) → ユーザ確認。
2. Rails API + 基本モデル実装 → Swagger 共有。
3. Vue SPA 実装 → Storybook で UI レビュー。
4. Python マッチングバッチ → A/B テスト。
5. 公開 β → フィードバック → V1 リリース。

---

(以上) 🔧

