/**
 * Better Authのインスタンス。Discord OAuthでサインインする。
 * D1バインディングをそのまま渡すと、Better Auth側がD1として認識する。
 *
 * `basePath`は既定の`/api/auth`のまま使う。静的ファイルと同じWorkerが受けるので、
 * Discordに登録するリダイレクトURIと、Workerが実際に受け取るパスが一致する。
 */
import { betterAuth } from "better-auth";
import { env } from "cloudflare:workers";

/**
 * Discordの値が`<`で始まるプレースホルダ(`.dev.vars.example`の値や、READMEの「初回のデプロイ」で入れる仮の値)なら、
 * サインインだけを無効にしてゲームは遊べるようにする。
 * wranglerは`secrets.required`に書いたシークレットしか`.dev.vars`から読まないので、値そのものは必須のままにしている。
 */
export function discordCredentials(): { clientId: string; clientSecret: string } | undefined {
  const clientId = env.DISCORD_CLIENT_ID;
  const clientSecret = env.DISCORD_CLIENT_SECRET;
  if (clientId.startsWith("<") || clientSecret.startsWith("<")) return undefined;
  return { clientId, clientSecret };
}

function create() {
  const discord = discordCredentials();
  return betterAuth({
    database: env.DB,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    socialProviders: discord ? { discord } : {},
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
