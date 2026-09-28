# browser-game-template

ブラウザゲームの雛形。`game-rule-engine`(純粋なルール層)→ `api`(Cloudflare Workers + D1 + Better Auth)→ `web`(React + Vite、Cloudflare Pages)の3層で、「サインインして遊ぶ → サーバーで判定 → 結果をD1に残す → 一覧で見る」の一本だけが通っている。

## このテンプレートから始める

```bash
cp -r browser-game-template <new> && cd <new> && rm -rf .git node_modules packages/*/node_modules packages/*/dist && git init
grep -rl browser-game-template --exclude-dir=node_modules . | xargs sed -i 's/browser-game-template/<new>/g'
npm install
```

置換されるのは、npmのルート名・Worker名(`<new>-api`)・Pages名(`<new>-web`)・D1名(`<new>`)・画面のタイトル。

`play()`(`packages/game-rule-engine/src/index.ts`)と`results`テーブルは例なので、ゲームのルールとテーブルに置き換える。

## ローカルで動かす

`packages/api/.dev.vars` を作る(gitignore済み)。

```
BETTER_AUTH_URL=http://localhost:5173
BETTER_AUTH_SECRET=<openssl rand -base64 32>
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
```

Discord Developer Portal のアプリケーションは全ゲームで1つ(`jimixer.com`)を共有する。ローカルのリダイレクトURI `http://localhost:5173/api/auth/callback/discord` は登録済み。

```bash
npm run dev   # http://localhost:5173
```

`BETTER_AUTH_URL` はviteの開発サーバーのオリジンにしておく。本番URLのままだと、Better Authが`Origin`を信頼せずサインインのPOSTが403になる。

## 初回のデプロイ

1. `cd packages/api && npx wrangler d1 create <new>` の `database_id` を `packages/api/wrangler.jsonc` に書く
2. `npx wrangler secret put BETTER_AUTH_SECRET`(`DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` も同様)
3. Discordのアプリに `https://<new>-web.pages.dev/api/auth/callback/discord` をリダイレクトURIとして足す
4. `npm run deploy`(mainから、コミット済みの状態で)

`deploy.sh` はテスト → webのビルド → D1の移行 → Worker → Pages → `/api/health` の疎通確認の順に進み、どこかで落ちたらそこで止まる。
