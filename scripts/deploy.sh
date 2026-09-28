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

# webのテストは型検査を含まないので、ビルドをここで通す。dist/ はPagesへ配る中身でもある
step "webのビルド"
npm run build --workspace web

# 移行はここまでのどれかが落ちたら走らない。リモートのD1への変更は取り消せない
step "D1の移行"
if ! (cd packages/api && npx wrangler d1 migrations apply browser-game-template --remote); then
  abort "移行に失敗した。D1のREST APIは散発的に403(code 7403)を返すことがあるので、まず数分置いて実行し直すこと"
fi

# Pagesのservice bindingはWorkerを名前で参照するため、Workerを先に置く
step "APIのWorker"
(cd packages/api && npx wrangler deploy)

step "Pages"
(cd packages/web && npx wrangler pages deploy)

step "疎通確認"
status=$(curl -s -o /dev/null -w '%{http_code}' https://browser-game-template-web.pages.dev/api/health)
[ "$status" = "200" ] || abort "公開エンドポイントが $status を返した。https://browser-game-template-web.pages.dev を確認すること"
echo "OK"
