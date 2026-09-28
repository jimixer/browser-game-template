/** service binding越しにAPI Workerを呼ぶ。Pagesが注入する */
interface Env {
  API: { fetch: (request: Request) => Promise<Response> };
}

/**
 * `/api/*`をAPI Workerへ転送する。Worker側も同じ`/api`配下にルートを持つのでパスは変えない。
 * 受け取ったRequestはそのまま渡せないため、同じURL・メソッド・ヘッダ・本文で作り直す。
 */
export function onRequest({ request, env }: { request: Request; env: Env }): Promise<Response> {
  return env.API.fetch(new Request(request.url, request));
}
