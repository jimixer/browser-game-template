# browser-game-template

ブラウザゲームの雛形。`game-rule-engine`(純粋なルール層)→ `api`(Cloudflare Workers + D1 + Better Auth)→ `web`(React + Vite)の3層で、「数を選んで遊ぶ → サーバーで判定する」の一本だけが通っている。Discordでサインインしていれば、結果をD1に残して一覧で見られる。webのビルド結果はapiのWorkerが静的ファイルとして一緒に配る([ADR 0001](docs/adr/0001-workers-static-assets.md))。

必要なもの: Node.js 22以降。デプロイにはCloudflareのアカウント、サインインにはDiscordのアカウントも要る。

## このテンプレートから始める

GitHubの「Use this template」で自分のリポジトリを作ってcloneし、プロジェクト名を置き換える。

```bash
git clone <自分のリポジトリ> <new> && cd <new>
git grep -l browser-game-template -- ':!README.md' | xargs sed -i 's/browser-game-template/<new>/g'
npm install
```

置換されるのは、npmのルート名・Worker名(`<new>`)・D1名(`<new>`)・画面のタイトル。

`play()`・`isValidGuess()`(`packages/game-rule-engine/src/index.ts`)と`results`テーブル(`packages/api/migrations/0002_results.sql`)は例なので、ゲームのルールとテーブルに置き換える。

## ローカルで動かす

```bash
npm run dev   # http://localhost:5173
```

これだけで、サインインせずに遊べる。初回は`packages/api/.dev.vars.example`が`packages/api/.dev.vars`(gitignore済み)にコピーされる。

## サインインを使う

結果を残すにはDiscordでのサインインが要る。

[Discord Developer Portal](https://discord.com/developers/applications) でアプリケーションを作り、OAuth2の画面で次を控える・登録する。

- Client ID と Client Secret
- Redirects に `http://localhost:5173/api/auth/callback/discord`(ローカル用)と `https://<new>.<サブドメイン>.workers.dev/api/auth/callback/discord`(本番用。`<サブドメイン>`は下の「初回のデプロイ」で確認する)

`packages/api/.dev.vars`のClient IDとClient Secretを埋め、`BETTER_AUTH_SECRET`を`openssl rand -base64 32`の出力に置き換えて、`npm run dev`を起動し直す。`BETTER_AUTH_URL`はviteの開発サーバーのオリジン(`http://localhost:5173`)のままにしておく。本番URLにすると、Better Authが`Origin`を信頼せずサインインのPOSTが403になる。

## 初回のデプロイ

```bash
npx wrangler login
cd packages/api
npx wrangler d1 create <new>              # 出力の database_id を wrangler.jsonc に書く
npx wrangler secret put BETTER_AUTH_SECRET  # DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET も同様
```

アカウントの`workers.dev`サブドメインを、ダッシュボードの Workers & Pages で確認する。`packages/api/wrangler.jsonc` の `BETTER_AUTH_URL` にある `<サブドメイン>` をそれに置き換え、そのURLに`/api/auth/callback/discord`を付けたものをDiscordのRedirectsにも足す。サブドメインはアカウントごとなので、Worker名が他のユーザーと衝突することはない。

`wrangler.jsonc` の変更をコミットしてから、mainで `npm run deploy` する。プレースホルダ(`<...>`)が残っていると `deploy.sh` は最初に止まる。

`deploy.sh` はテスト → lint → 型検査 → webのビルド → D1の移行 → Worker(webの静的ファイルを含む)→ `/api/health` の疎通確認の順に進み、どこかで落ちたらそこで止まる。以降のデプロイも `npm run deploy` だけでよい。
