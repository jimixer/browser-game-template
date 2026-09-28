#!/usr/bin/env bash
#
# ローカルの開発サーバー2つ(api: 8787 / web: 5173)を、前提を揃えてから同時に起動する。
# Ctrl-Cで両方とも止まる。キー操作のショートカット(wranglerの[b]、viteのh+enter)は使えない。wranglerが抱えるworkerdまで落とすため、ジョブ制御を有効にして
# プロセスグループごと終了させる(このスクリプトが起動した分だけが対象)。
set -euo pipefail
set -m

cd "$(dirname "$0")/.."

abort() { printf '\n%s\n' "$1" >&2; exit 1; }

for port in 8787 5173; do
  if (exec 3<>/dev/tcp/127.0.0.1/"$port") 2>/dev/null; then
    abort "ポート $port が既に使われている。別のセッションの開発サーバーが動いていないか確認すること"
  fi
done

# apiもwebもgame-rule-engineのdist/を読む。ソースを直しただけでは反映されない
echo "=== game-rule-engine のビルド"
npm run build --workspace game-rule-engine

# 移行を当てていないローカルD1は、新しいコードが読むテーブルを持たない
echo "=== ローカルD1の移行"
(cd packages/api && npx wrangler d1 migrations apply browser-game-template --local)

if grep -q '<ここに' packages/api/.dev.vars 2>/dev/null; then
  echo "注意: packages/api/.dev.vars のDiscordの値がプレースホルダのまま。サインインは使えない" >&2
fi

# 標準入力は端末から切り離す。ジョブ制御のもとでは2つとも前面ではないプロセスグループになり、
# wranglerとviteがキー操作のために端末を読みにいくとSIGTTINで止まる(waitが戻り、スクリプトごと終わってしまう)
(cd packages/api && npm run dev) </dev/null &
api=$!
(cd packages/web && npm run dev) </dev/null &
web=$!

cleanup() {
  trap - EXIT INT TERM
  for pid in "$api" "$web"; do kill -- "-$pid" 2>/dev/null || true; done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "=== web http://localhost:5173 / api http://localhost:8787"
# どちらかが落ちたら、もう片方も止めて終わる(片方だけ動いている状態を残さない)
wait -n
