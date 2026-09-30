/**
 * Better Authのインスタンス。Discord OAuthでサインインする。
 * D1バインディングをそのまま渡すと、Better Auth側がD1として認識する。
 *
 * `basePath`は既定の`/api/auth`のまま使う。静的ファイルと同じWorkerが受けるので、
 * Discordに登録するリダイレクトURIと、Workerが実際に受け取るパスが一致する。
 */
import { betterAuth } from "better-auth";
import { env } from "cloudflare:workers";

function create() {
  return betterAuth({
    database: env.DB,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    socialProviders: {
      discord: {
        clientId: env.DISCORD_CLIENT_ID,
        clientSecret: env.DISCORD_CLIENT_SECRET,
      },
    },
  });
}

let instance: ReturnType<typeof create> | undefined;

/**
 * 初回のリクエストで組み立てる。Workersはリクエストの外でのI/Oを禁じており、
 * モジュール読み込み時に作るとBetter Authのスキーマ検証がそこで失敗する。
 */
export function auth(): ReturnType<typeof create> {
  instance ??= create();
  return instance;
}
