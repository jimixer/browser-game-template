#!/usr/bin/env bash
#
# ローカルの開発サーバー2つ(api: 8787 / web: 5173)を、前提を揃えてから同時に起動する。
# Ctrl-Cですべて止まる。キー操作のショートカット(wranglerの[b]、viteのh+enter)は使えない。wranglerが抱えるworkerdまで落とすため、ジョブ制御を有効にして
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

# wrangler devはassetsのディレクトリがないと起動しない。画面はviteが配るので中身は空でよい
mkdir -p packages/web/dist

# 移行を当てていないローカルD1は、新しいコードが読むテーブルを持たない
echo "=== ローカルD1の移行"
(cd packages/api && npx wrangler d1 migrations apply DB --local)

# なければ例をコピーして起動する。サインインしなくても遊べるので、Discordの値は後から入れればよい
if [ ! -f packages/api/.dev.vars ]; then
  cp packages/api/.dev.vars.example packages/api/.dev.vars
  echo "=== packages/api/.dev.vars を .dev.vars.example からコピーした"
fi
if grep -q '<ここに' packages/api/.dev.vars; then
  echo "注意: packages/api/.dev.vars にプレースホルダが残っている。サインインは使えない" >&2
fi

# 標準入力は端末から切り離す。ジョブ制御のもとではどちらも前面ではないプロセスグループになり、
# wranglerとviteがキー操作のために端末を読みにいくとSIGTTINで止まったまま応答しなくなる
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
# どれかが落ちたら、残りも止めて終わる(一部だけ動いている状態を残さない)。
# wait -n はmacOS標準のbash 3.2にないので、生きているかを見て回る
while kill -0 "$api" 2>/dev/null && kill -0 "$web" 2>/dev/null; do
  sleep 1
done
