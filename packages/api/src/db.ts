/**
 * D1バインディングへの入口。`httpServerHandler`経由で動くExpressのハンドラは
 * Workerの`env`を引数で受け取らないため、`cloudflare:workers`のモジュールレベルの
 * `env`から取る。
 */
import { env } from "cloudflare:workers";

export function db(): D1Database {
  return env.DB;
}
