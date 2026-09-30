# browser-game-template

ブラウザゲームの雛形。`game-rule-engine`(純粋なルール層)→ `api`(Hono on Cloudflare Workers + D1 + Better Auth、[ADR 0002](docs/adr/0002-hono.md))→ `web`(React + Vite)の3層で、「数を選んで遊ぶ → サーバーで判定する」の一本だけが通っている。認証(Better Auth + Discord)とD1はつないであり、ゲームのデータを残す部分は各ゲームで足す。webのビルド結果はapiのWorkerが静的ファイルとして一緒に配る([ADR 0001](docs/adr/0001-workers-static-assets.md))。

必要なもの: Node.js 22以降。デプロイにはCloudflareのアカウント、サインインにはDiscordのアカウントも要る。

## このテンプレートから始める

GitHubの「Use this template」で自分のリポジトリを作ってcloneし、プロジェクト名を置き換える。

```bash
git clone <自分のリポジトリ> <new> && cd <new>
git grep -l browser-game-template -- ':!README.md' | xargs perl -pi -e 's/browser-game-template/<new>/g'
npm install
```

置換されるのは、npmのルート名・Worker名(`<new>`)・D1名(`<new>`)・画面のタイトル。

数当ては例なので、ゲームに置き換える。例のコードは次の場所にある。

- ルール: `packages/game-rule-engine/src/index.ts`(`play()`・`isValidGuess()`)とそのテスト
- API: `packages/api/src/index.ts`の`POST /api/play`
- 画面: `packages/web/src/pages/HomePage.tsx`と、`packages/web/src/data/apiClient.ts`の`play()`

### ゲームの状態を残す

この雛形は、1回の操作ごとにapiへ問い合わせてサーバーで判定する。往復に数十〜数百ミリ秒かかってよいゲーム(ターン制のゲーム、複数人で同じボスを叩くマルチバトルなど)に向く。サーバーが1秒に数十回状態を進めるような、反応の厳しいアクションゲームは対象外。

状態はまずD1に残す。

- `packages/api/migrations/`に`0002_`から移行を足す。`0001`は認証のテーブルなので触らない。
- ユーザーごとのデータを扱うルートには`requireUser`(`packages/api/src/session.ts`)を掛け、`currentUserId(c)`で主体を取る。
- サインインしていないゲストにはユーザーIDがない。ゲストの状態も残すなら、ゲームのIDを発行してクライアントに持たせる。
- 複数人が同時に書き換える値(ボスのHPなど)は、`UPDATE ... SET hp = hp - ? ... RETURNING hp`のようにSQL 1文で書き換える。読んで、ルール層で計算して、書き戻すと、間に入った他のリクエストの更新が消える。

次のどちらかに当てはまったら、共有する状態をDurable Objectsに移す。1つのバトルを1つのDurable Objectにすると、そのバトルへの操作が1か所で順に処理される。

- 共有する状態を、SQL 1文ではなくルール層で計算して書き換える必要がある。
- 他の人の操作を、問い合わせを待たずにすぐ届けたい(WebSocket)。Workerは`stub.fetch(c.req.raw)`でリクエストをそのままDurable Objectへ渡す。

画面は同じオリジンの資源しか読めない(`packages/web/public/_headers`のCSP)。外部のフォント・画像・CDNを使うときは、そのオリジンをCSPに足す。足さないと、画面には何も出ずにブラウザのコンソールにだけエラーが出る。

## ローカルで動かす

```bash
npm run dev   # http://localhost:5173
```

これだけで、サインインせずに遊べる。初回は`packages/api/.dev.vars.example`が`packages/api/.dev.vars`(gitignore済み)にコピーされる。

## サインインを使う

ユーザーを識別するには、Discordでのサインインを使う。

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
