# CLAUDE.md

## プロジェクト概要
ブラウザゲームの雛形。ゲームルール層・アプリケーション層・UI層の3パッケージに分け、Cloudflare(Workers + D1)にデプロイする。webのビルド結果はapiのWorkerがWorkers Static Assetsで一緒に配る。認証はBetter Auth + Discord OAuth。

新しいゲームを始めるときは README の「このテンプレートから始める」を参照。

## リポジトリ構成
```
docs/adr/                  確定した決定の記録(棄却案とその理由も残す)
packages/
  game-rule-engine/        ゲームルール層(DB/API/インフラに非依存の純粋なTypeScript)
  api/                     アプリケーション層(Express on Cloudflare Workers、D1、Better Auth)
  web/                     UI層(React + Vite + Tailwind)
scripts/                   ローカル起動とデプロイ
```

## 設計上の原則
- **レイヤー独立性**: ゲームルール層はDB/UI/インフラのいずれにも依存しない。純粋関数のみで構成する。アプリケーション層はルール層を呼び出すだけに徹する
- **判定はサーバー権威**: 判定ロジックをクライアント側に置かない。webはapiの結果を表示するだけ
- **ゲームのテーブルから認証テーブルへ外部キーを張らない**: `user_id`は素の`TEXT`列にする。認証テーブルを別のデータベースへ切り出せるようにするため
- **D1の移行は足すだけにする**: 当てた移行を書き換えても再実行されず、スキーマと移行ファイルが黙って食い違う。`0001`は認証のテーブルで、ゲームのテーブルは`0002_`から足す

## 開発コマンド
```bash
npm run dev      # ローカルのapi(8787)とweb(5173)を同時に起動する(scripts/dev.sh)
npm run deploy   # 本番へデプロイする(scripts/deploy.sh)。D1の移行をWorkerより先に当てる順序を崩さないこと
npm test --workspaces --if-present
npm run typecheck --workspace api   # apiはテストの代わりに型検査。wrangler deployは型を見ない
```
- テストはNode標準の`node:test`(依存を増やさない)
- Node.js 22系以降が必要
- apiとwebは`game-rule-engine`のソース(`src/`)を直接読む。`dist/`はルール層のテストを走らせるためだけにある
