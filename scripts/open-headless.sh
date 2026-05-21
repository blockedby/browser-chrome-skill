#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"

chrome="$(bc_chrome_bin)" || {
  echo "FAILED mode=headless reason=chrome-not-found set BROWSER_CHROME_BIN" >&2
  exit 1
}

id="$(bc_id)"
port="$(bc_pick_port)"
url="http://127.0.0.1:$port"
state_dir="$(bc_headless_state_dir)"
profile_dir="$state_dir/$id-profile"
log_dir="$(bc_home)/logs"
log_file="$log_dir/headless-$id.log"
state_file="$state_dir/$id.env"

mkdir -p "$profile_dir" "$state_dir" "$log_dir"

"$chrome" \
  --headless=new \
  --disable-gpu \
  --hide-scrollbars \
  --mute-audio \
  "--remote-debugging-address=127.0.0.1" \
  "--remote-debugging-port=$port" \
  "--user-data-dir=$profile_dir" \
  --no-first-run \
  --no-default-browser-check \
  ${BROWSER_CHROME_HEADLESS_EXTRA_ARGS:-} \
  >>"$log_file" 2>&1 &

pid=$!
cat >"$state_file" <<EOF
BROWSER_CHROME_ID='$id'
BROWSER_CHROME_MODE='headless'
BROWSER_CHROME_PID='$pid'
BROWSER_CHROME_PORT='$port'
BROWSER_CHROME_DEBUG_URL='$url'
BROWSER_CHROME_USER_DATA_DIR='$profile_dir'
BROWSER_CHROME_LOG_FILE='$log_file'
BROWSER_CHROME_STATE_FILE='$state_file'
EOF

if bc_wait_endpoint "$url"; then
  printf 'OPEN mode=headless id=%s url=%s pid=%s profile=%s state=%s log=%s\n' "$id" "$url" "$pid" "$profile_dir" "$state_file" "$log_file"
  if [ "${1:-}" = "--print-env" ]; then
    cat "$state_file"
  fi
  exit 0
fi

kill "$pid" >/dev/null 2>&1 || true
rm -rf "$profile_dir" "$state_file"
printf 'FAILED mode=headless id=%s url=%s pid=%s log=%s reason=timeout\n' "$id" "$url" "$pid" "$log_file" >&2
exit 1
