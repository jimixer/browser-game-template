# 0001 webとapiを1つのWorkerで配る

- 状態: 採用
- 決定日: 2026-09-30

## 背景

当初の構成では、webをCloudflare Pagesで配り、`/api/*`をPages Functionsからservice bindingでapiのWorkerへ転送していた。この構成には次の問題があった。

- デプロイ先がWorkerとPagesの2つに分かれる。Pagesのservice bindingはWorkerを名前で参照するため、Workerを先に配る順序を守る必要がある。
- `pages.dev`のプロジェクト名は全ユーザーで共有される。名前が使われていると接尾辞が付き、Better Authの`BETTER_AUTH_URL`やDiscordのリダイレクトURIと一致しなくなる。
- 転送のためだけの関数(`packages/web/functions/api/[[path]].ts`)を置く必要がある。

## 決定

Workers Static Assetsを使い、apiのWorkerがwebのビルド結果(`packages/web/dist`)もあわせて配る。`packages/api/wrangler.jsonc`の`assets`で次のように設定する。

- `run_worker_first: ["/api/*"]`: `/api/*`だけをWorker(Hono)で処理する。
- `not_found_handling: "single-page-application"`: それ以外のパスで静的ファイルが見つからなければ`index.html`を返す。

ローカル開発は従来どおり、viteの開発サーバーが`/api`をwrangler devへ転送する形を保つ。

## 採らなかった案

- Pagesとservice bindingの構成を続ける案: 背景に挙げた3つの問題が残るため採らない。
- `@cloudflare/vite-plugin`で開発サーバーを1つにまとめる案: 依存が増え、Express on Workersがこのプラグインの上で動くかの検証も要る。現在の転送で困っていないため採らない。開発時の構成に問題が出たら再検討する。

## 結果

- デプロイは`wrangler deploy`の1回になり、Workerと静的ファイルが同時に切り替わる。WorkerとPagesの間の順序の制約はなくなる。
- 公開URLは`<Worker名>.<アカウントのサブドメイン>.workers.dev`になる。サブドメインはアカウントごとなので、他のユーザーと名前が衝突しない。一方で、サブドメインを確認してから`BETTER_AUTH_URL`とDiscordのリダイレクトURIを設定する手順が要る。
- `wrangler deploy`と`wrangler dev`は`packages/web/dist`がないと止まる。デプロイでは先にwebをビルドし、開発ではディレクトリを作ってから起動する。
- 静的ファイルへのヘッダーは、従来どおり`packages/web/public/_headers`で付ける。Workerが返す`/api/*`の応答には付かない。
