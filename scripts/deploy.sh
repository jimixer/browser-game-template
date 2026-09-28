#!/usr/bin/env bash
#
# 本番(Cloudflare)へのデプロイ。README の手順を順に実行する。
# どの段階で落ちてもそこで止まる。特にD1の移行が失敗したままWorkerを配ると、
# 新しいコードが存在しないテーブルを読む状態になる。
set -euo pipefail

cd "$(dirname "$0")/.."

step() { printf '\n=== %s\n' "$1"; }
abort() { printf '\n%s\n' "$1" >&2; exit 1; }

branch=$(git rev-parse --abbrev-ref HEAD)
# Pagesの本番URLは本番ブランチからのデプロイでしか更新されず、他はプレビュー扱いになる
[ "$branch" = "main" ] || abort "mainからデプロイすること(いまは $branch)"
[ -z "$(git status --porcelain)" ] || abort "コミットしていない変更がある。何を配ったのかを後から辿れるようにしてから実行すること"

step "テスト"
npm test --workspaces --if-present

# wrangler deployは型を検査せずに束ねるので、ここで通す
step "apiの型検査"
npm run typecheck --workspace api

# webのテストは型検査を含まないので、ビルドをここで通す。dist/ はPagesへ配る中身でもある
step "webのビルド"
npm run build --workspace web

# 移行はここまでのどれかが落ちたら走らない。リモートのD1への変更は取り消せない
step "D1の移行"
if ! (cd packages/api && npx wrangler d1 migrations apply DB --remote); then
  abort "移行に失敗した。D1のREST APIは散発的に403(code 7403)を返すことがあるので、まず数分置いて実行し直すこと"
fi

# Pagesのservice bindingはWorkerを名前で参照するため、Workerを先に置く
step "APIのWorker"
(cd packages/api && npx wrangler deploy)

step "Pages"
(cd packages/web && npx wrangler pages deploy)

# 公開URLはBetter Authに渡している値と同じものを見る。pages.devの名前が埋まっていて接尾辞が付いたときも、直すのはwrangler.jsoncの1か所で済む
step "疎通確認"
url=$(grep -o '"BETTER_AUTH_URL": *"[^"]*"' packages/api/wrangler.jsonc | cut -d'"' -f4)
status=$(curl -s -o /dev/null -w '%{http_code}' "$url/api/health")
[ "$status" = "200" ] || abort "公開エンドポイントが $status を返した。$url を確認すること"
echo "OK"
