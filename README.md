# 1. プロジェクト概要
趣味でスポーツ（特に草野球）を楽しむ個人・チーム向けに、試合相手を効率良くマッチングする Web アプリを開発する。

---

## 2. システム構成と採用技術
| レイヤ | 主な技術 | 役割 |
|---------|----------|------|
| **フロントエンド** | HTML / CSS / JavaScript (Vue 3 + Vite) | レスポンシブ UI、入力フォーム、リアルタイム一覧更新、地図表示（Leaflet） |
| **バックエンド API** | Ruby (Ruby on Rails 7) | REST/GraphQL API 提供、認証 (Devise + JWT)、業務ロジック、データ永続化 |
| **マッチングロジック** | Python 3.12 | 試合条件（場所・日程・練度・志向性など）のスコアリング＆レコメンド、バッチ処理・定時マッチング |
| **データベース** | PostgreSQL 15 | 正規化されたリレーショナルデータ格納、GIS 拡張 (PostGIS) で位置検索 |
| **インフラ** | Docker / Docker‑Compose, GitHub Actions, Fly.io | コンテナ化・CI/CD・ステージング／本番デプロイ |

---

## 3. 主要機能一覧
1. **ユーザー登録 / 認証**  
   - メール & パスワード or SNS OAuth (Google, X)
2. **プロフィール管理**  
   - 年齢・経験年数・ポジション・自己紹介
3. **チーム管理**  
   - チーム作成 / メンバー招待 / ロール設定 (代表・副代表・メンバー)
4. **試合募集作成**  
   - 開催日時・場所（球場）・募集コメント・経験年数帯・ガチ/カジュアル・必要人数・費用
5. **試合一覧 & 詳細閲覧**  
   - フィルタ（距離・日付・志向性）／ソート  
   - 地図上プロット
6. **参加リクエスト**  
   - ボタン１つで送信、主催者は承認／拒否  
   - マッチング成立後はチャットルーム生成
7. **チャット & 通知**  
   - Pusher などの WebSocket でリアルタイム  
   - プッシュ通知 (Web Push / Firebase FCM)
8. **レビュー / 評価**  
   - 試合後に 5 段階評価＋コメント
9. **管理者ダッシュボード**  
   - 通報管理・統計・ユーザー凍結

---

## 4. 画面一覧 & 画面遷移
1. トップページ（募集一覧）
2. 募集詳細ページ
3. 募集作成 / 編集フォーム
4. チーム管理ダッシュボード
5. プロフィール設定
6. チャットルーム
7. 管理者画面

> 別紙に Figma ワイヤーフレームを添付予定

---

## 5. API 仕様（抜粋）
| メソッド | エンドポイント | 機能 | 認証 |
|----------|----------------|------|------|
| POST | /api/v1/auth/signup | 新規登録 | なし |
| POST | /api/v1/matches | 募集作成 | JWT |
| GET | /api/v1/matches | 募集検索 | 任意 |
| POST | /api/v1/matches/:id/join | 参加リクエスト | JWT |
| POST | /api/v1/matches/:id/accept | 参加承認 | JWT (主催者) |

---

## 6. データベース ER 図（論理モデル）
```
users ─┐
       │1   n
teams ─┘  team_members (role)

matches (team_id, field_id, date, level, style)
match_participants (match_id, team_id, status)

fields (name, lat, lng, address, fee)
reviews (match_id, reviewer_id, score, comment)
```

---

## 7. マッチングアルゴリズム（Python）
- scikit‑learn の `NearestNeighbors` で位置 + 日程の近さを評価
- カテゴリ特徴（練度・志向性）は one‑hot → Cosine 類似度
- 合算スコア上位 10 件を Rails API 経由で返却
- バッチ実行: GitHub Actions + cron (1h)

---

## 8. 非機能要件
| 区分 | 要件 |
|------|------|
| パフォーマンス | 募集一覧 API < 200 ms／50rps |
| スケーラビリティ | オートスケール (Fly.io Machines) |
| セキュリティ | TLS 1.3, JWT 15 min 失効, rate‑limit 100/min/IP |
| テスト | RSpec (BE) / Vitest + Playwright (FE) カバレッジ80% 以上 |
| 運用 | Sentry / Grafana Cloud 監視、週1リリース |

---

## 9. 開発スケジュール (概算)
| フェーズ | 期間 | 主タスク |
|----------|------|-----------|
| 要件定義 |  | 仕様書確定・WF・ER図 |
| 設計     |  | API スキーマ・UI デザイン |
| 実装①   |  | 認証・プロフィール・チーム機能 |
| 実装②   |  | 募集 CRUD・検索・チャット |
| 実装③   |  | マッチングアルゴリズム・通知 |
| テスト   |  | E2E / 負荷試験 |
| リリース | —      | v1.0 本番公開 |

---

### 付録 A. 使用 Gem / NPM パッケージ
- Rails 7, Devise, JWT, Pundit, RGeo
- Vue 3, Pinia, Vue‑Router, TailwindCSS
- Python: scikit‑learn, pandas, geopy

---

> 本仕様書は 2025‑04‑30 版。以降の変更はバージョン管理で追跡する。

