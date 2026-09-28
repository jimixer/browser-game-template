# browser-game-template

ブラウザゲームの雛形。`game-rule-engine`(純粋なルール層)→ `api`(Cloudflare Workers + D1 + Better Auth)→ `web`(React + Vite、Cloudflare Pages)の3層で、「Discordでサインインして遊ぶ → サーバーで判定 → 結果をD1に残す → 一覧で見る」の一本だけが通っている。

必要なもの: Node.js 22以降、Cloudflareのアカウント、Discordのアカウント。

## このテンプレートから始める

GitHubの「Use this template」で自分のリポジトリを作ってcloneし、プロジェクト名を置き換える。

```bash
git clone <自分のリポジトリ> <new> && cd <new>
git grep -l browser-game-template -- ':!README.md' | xargs sed -i 's/browser-game-template/<new>/g'
npm install
```

置換されるのは、npmのルート名・Worker名(`<new>-api`)・Pages名(`<new>-web`)・D1名(`<new>`)・画面のタイトル。

`play()`(`packages/game-rule-engine/src/index.ts`)と`results`テーブル(`packages/api/migrations/0002_results.sql`)は例なので、ゲームのルールとテーブルに置き換える。

## Discordのアプリを作る

[Discord Developer Portal](https://discord.com/developers/applications) でアプリケーションを作り、OAuth2の画面で次を控える・登録する。

- Client ID と Client Secret
- Redirects に `http://localhost:5173/api/auth/callback/discord`(ローカル用)と `https://<new>-web.pages.dev/api/auth/callback/discord`(本番用)

## ローカルで動かす

```bash
cp packages/api/.dev.vars.example packages/api/.dev.vars   # 値を埋める(gitignore済み)
npm run dev   # http://localhost:5173
```

`BETTER_AUTH_SECRET` は `openssl rand -base64 32` で作る。`BETTER_AUTH_URL` はviteの開発サーバーのオリジン(`http://localhost:5173`)のままにしておく。本番URLにすると、Better Authが`Origin`を信頼せずサインインのPOSTが403になる。

## 初回のデプロイ

```bash
npx wrangler login
cd packages/api
npx wrangler d1 create <new>              # 出力の database_id を wrangler.jsonc に書く
npx wrangler secret put BETTER_AUTH_SECRET  # DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET も同様
cd ../web
npx wrangler pages project create <new>-web --production-branch main
```

Pagesのプロジェクト名は全ユーザーで共有の名前空間なので、既に使われていると`<new>-web-xxx.pages.dev`のように接尾辞が付く。そのときは作成時に表示されたURLを、`packages/api/wrangler.jsonc` の `BETTER_AUTH_URL` とDiscordのRedirectsに反映する。

`database_id` の変更をコミットしてから、mainで `npm run deploy` する。

`deploy.sh` はテスト → 型検査 → webのビルド → D1の移行 → Worker → Pages → `/api/health` の疎通確認の順に進み、どこかで落ちたらそこで止まる。以降のデプロイも `npm run deploy` だけでよい。
