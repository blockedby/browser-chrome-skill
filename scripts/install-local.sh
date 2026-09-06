#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
PI_AGENT_DIR="${PI_AGENT_DIR:-$HOME/.pi/agent}"
TARGET_SKILL_DIR="${BROWSER_CHROME_SKILL_TARGET:-$PI_AGENT_DIR/skills/browser-chrome}"
MCP_JSON="${BROWSER_CHROME_MCP_JSON:-$PI_AGENT_DIR/mcp.json}"

if [ "$(cd -- "$SKILL_DIR" && pwd -P)" = "$(cd -- "$TARGET_SKILL_DIR" 2>/dev/null && pwd -P || true)" ]; then
  echo "browser-chrome: source and install target must be different directories; use install-runtime.sh for an in-place runtime install" >&2
  exit 1
fi

# Prepare a complete installation before touching the existing skill or MCP config.
stage="$(mktemp -d "${TMPDIR:-/tmp}/browser-chrome-install.XXXXXX")"
trap 'rm -rf "$stage"' EXIT
(cd "$SKILL_DIR" && tar --exclude='.git' --exclude='.gitmodules' --exclude='node_modules' -cf - .) | (cd "$stage" && tar -xf -)
bash "$stage/scripts/install-runtime.sh"

mkdir -p "$TARGET_SKILL_DIR" "$PI_AGENT_DIR"

if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete \
    --exclude '.git' \
    --exclude '.gitmodules' \
    "$stage/" "$TARGET_SKILL_DIR/"
else
  rm -rf "$TARGET_SKILL_DIR"
  mkdir -p "$TARGET_SKILL_DIR"
  (cd "$stage" && tar -cf - .) | (cd "$TARGET_SKILL_DIR" && tar -xf -)
fi

python3 - "$MCP_JSON" "$TARGET_SKILL_DIR/scripts/mcp.sh" "$TARGET_SKILL_DIR/scripts/control-mcp.sh" <<'PY'
import json
import sys
from pathlib import Path

mcp_path = Path(sys.argv[1]).expanduser()
command = sys.argv[2]
control_command = sys.argv[3]
if mcp_path.exists():
    with mcp_path.open() as f:
        data = json.load(f)
else:
    data = {}
servers = data.setdefault("mcpServers", {})
servers["browser-chrome-control"] = {
    **servers.get("browser-chrome-control", {}),
    "command": control_command,
    "args": [],
    "lifecycle": "lazy",
}
servers["browser-chrome-headed"] = {
    **servers.get("browser-chrome-headed", {}),
    "command": command,
    "args": ["headed"],
    "lifecycle": "lazy",
    "env": {**servers.get("browser-chrome-headed", {}).get("env", {}), "CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS": "1"},
}
servers["browser-chrome-headless"] = {
    **servers.get("browser-chrome-headless", {}),
    "command": command,
    "args": ["headless"],
    "lifecycle": "lazy",
    "idleTimeout": 1,
    "env": {**servers.get("browser-chrome-headless", {}).get("env", {}), "CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS": "1"},
}
mcp_path.parent.mkdir(parents=True, exist_ok=True)
if mcp_path.exists():
    backup = mcp_path.with_suffix(mcp_path.suffix + ".bak")
    backup.write_text(mcp_path.read_text())
with mcp_path.open("w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
PY

chmod +x "$TARGET_SKILL_DIR/scripts/"*.sh

echo "Installed browser-chrome skill to $TARGET_SKILL_DIR"
echo "Updated MCP config at $MCP_JSON"
echo "MCP servers: browser-chrome-control, browser-chrome-headed, browser-chrome-headless"
echo "Restart Pi or reconnect MCP servers before first use."
