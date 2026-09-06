# browser-chrome skill

[![skills.sh](https://skills.sh/b/blockedby/browser-chrome-skill)](https://skills.sh/blockedby/browser-chrome-skill)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A portable [Agent Skills](https://skills.sh/) package for using Chrome through Chrome DevTools MCP.

- Skill name: `browser-chrome`
- Control/session MCP script: `scripts/control-mcp.sh`
- DevTools MCP wrapper: `scripts/mcp.sh`
- DevTools MCP package: `chrome-devtools-mcp` (version pinned by this skill)

## Contract

- **Inputs:** the browser automation or debugging need, plus whether authenticated or persistent session state is required.
- **Outputs:** an explicit safe browser form and operational access through the matching DevTools MCP server:
  - `headless-disposable` → `browser-chrome-headless`
  - `headed-persistent` → `browser-chrome-headed`
- **Non-goals:** reading or exporting passwords, cookies, tokens, or private profile files; silently attaching to a personal profile; or claiming that DevTools access provides sandbox isolation.

## Runtime requirements

- Google Chrome or Chromium.
- A Node.js version supported by the pinned MCP release (currently 20.19+, 22.12+, or 23+; Node 21 is not supported).
- npm for installation and updates. Normal MCP startup does not use npm or npx.
- Pi with [`pi-mcp-adapter`](https://github.com/nicobailon/pi-mcp-adapter) installed and enabled.
- Network access to npm during installation. Once installed, starting MCP does not require npm registry access.

## Install with skills CLI

From a checkout of this repository:

```bash
npx skills add . --skill browser-chrome --agent pi --global --yes
```

Or install the public repository directly:

```bash
npx skills add blockedby/browser-chrome-skill --skill browser-chrome --agent pi --global --yes
```

The skills CLI installs the skill instructions. It does not configure MCP servers; use the local installer below when MCP access is needed.

## Install local MCP entries

From the repository checkout:

```bash
./scripts/install-local.sh
```

The installer first installs and verifies the pinned MCP runtime using the bundled lockfile. If that fails, the existing skill and MCP configuration stay intact. It then copies the skill to `~/.pi/agent/skills/browser-chrome` (or the configured target) and merges three direct-path entries into `~/.pi/agent/mcp.json`:

- `browser-chrome-control` — policy and session selection;
- `browser-chrome-headed` — persistent headed DevTools access;
- `browser-chrome-headless` — disposable headless DevTools access.

Existing MCP servers and custom browser environment settings are preserved. If an MCP file already exists, the installer writes a `.bak` copy before updating it. Restart Pi or reconnect MCP after installation. Use `npm run validate` to run the local deterministic checks without starting Chrome.

The example configuration is in [`mcp/browser-chrome.mcp.json`](mcp/browser-chrome.mcp.json); it uses command aliases for manually managed installations, while `install-local.sh` writes absolute paths to the copied scripts.

## Use with Codex or another MCP client

Install the runtime in your skill checkout once:

```bash
bash /absolute/path/to/browser-chrome-skill/scripts/install-runtime.sh
```

Configure the client to run the scripts using absolute paths. For Codex, add or update these sections in `~/.codex/config.toml` (replace the example paths):

```toml
[mcp_servers.browser-chrome-control]
command = "/absolute/path/to/browser-chrome-skill/scripts/control-mcp.sh"
startup_timeout_sec = 60

[mcp_servers.browser-chrome-headed]
command = "/absolute/path/to/browser-chrome-skill/scripts/mcp.sh"
args = ["headed-connect"]
startup_timeout_sec = 60

[mcp_servers.browser-chrome-headless]
command = "/absolute/path/to/browser-chrome-skill/scripts/mcp.sh"
args = ["headless"]
startup_timeout_sec = 60
```

`headed-connect` starts the MCP server without opening Chrome. Ask the control server for a persistent session before using headed browser tools. This suits clients that initialize all MCP servers on startup. The Pi installer uses `headed` with lazy startup, which can open or reuse Chrome when that server is requested.

The launcher preserves the caller's working directory. It starts its own installed runtime directly, so project dependencies and npm configuration do not participate in MCP startup. Installing just the skill instructions is not enough: install the runtime before connecting MCP.

## Update or repair the MCP runtime

Update the skill to a reviewed release, then rerun `scripts/install-local.sh` for a Pi installation, or `scripts/install-runtime.sh` for an in-place installation. There is no automatic update during MCP startup. Maintainers change `runtime/package.json` and `runtime/package-lock.json` together when updating the pinned MCP version.

## Select a browser mode

When the control MCP is available, call it first:

```text
mcp({ server: "browser-chrome-control" })
# call browser_chrome_status or browser_chrome_acquire_session
```

### Headless disposable

Use `headless-disposable` for public or anonymous pages, local UI smoke tests, screenshots, simple fetches, and parallel work. It creates a fresh profile, a unique debugging port, and cleans up when the DevTools MCP wrapper exits. It must not be used when saved authentication or profile state is required.

1. Call `browser_chrome_acquire_session` with `form: "headless-disposable"`.
2. Use `browser-chrome-headless` for `chrome_devtools_*` actions.
3. Close pages opened for the task when possible; the wrapper closes the disposable browser afterward.

### Headed persistent

Use `headed-persistent` only for login/logout, current authentication, saved sessions, saved passwords, extensions, or other explicitly requested persistent profile state.

1. Call `browser_chrome_acquire_session` with `form: "headed-persistent"` and a short purpose, or call `browser_chrome_assert_persistent` for validation only.
2. The control MCP takes a cross-process advisory lease, opens or reuses the configured endpoint, and returns `browser-chrome-headed` guidance.
3. Use `browser-chrome-headed` for `chrome_devtools_*` actions.
4. Call `browser_chrome_release` with the returned `leaseId` when finished. Release drops the lease; it does not close the headed browser.

A `headed-disposable` form is modeled by the control MCP but is not launched by this package. Use `headless-disposable` for disposable work or `headed-persistent` when persistent state is required.

## Configuration

The most relevant environment variables are:

```bash
# Persistent headed endpoint. The control policy accepts ports 9200-9300.
BROWSER_CHROME_HEADED_URL=http://127.0.0.1:9233

# Local headed browser launch settings.
BROWSER_CHROME_HEADED_PORT=9233
BROWSER_CHROME_HEADED_BIND_ADDRESS=127.0.0.1
BROWSER_CHROME_HEADED_USER_DATA_DIR=$HOME/.cache/browser-chrome/headed-profile
BROWSER_CHROME_HEADED_PROFILE_DIRECTORY=Default

# Optional custom start command for a remote headed host.
BROWSER_CHROME_HEADED_START_COMMAND='ssh desktop-host /path/to/browser-chrome/scripts/open-headed.sh'
BROWSER_CHROME_HEADED_LOCAL_START=0

# Optional custom start/close commands for a remote disposable headless host.
# The start command must print: OPEN mode=headless id=<id> url=<debug-url>
BROWSER_CHROME_HEADLESS_START_COMMAND='ssh desktop-host /path/to/browser-chrome/scripts/open-headless.sh'
BROWSER_CHROME_HEADLESS_CLOSE_COMMAND='ssh desktop-host /path/to/browser-chrome/scripts/close-headless.sh "$BROWSER_CHROME_ID"'
BROWSER_CHROME_HEADLESS_LOCAL_START=0

# Chrome and MCP runtime overrides.
BROWSER_CHROME_BIN=google-chrome-stable
BROWSER_CHROME_NODE=node
BROWSER_CHROME_NPM=npm # installation only
```

For LAN, Tailscale, or SSH-tunnel use, set endpoint URLs, bind addresses, and remote start/close commands deliberately. The debug endpoint is powerful; restrict its exposure to the intended host/network.

## Security boundaries

The default headed profile is a dedicated profile under `BROWSER_CHROME_HOME`, not the normal personal Chrome profile. A custom endpoint or start command may still point to an authenticated profile, so configure it intentionally and only select `headed-persistent` when that access is required. Never print or copy credentials or browser storage. DevTools endpoint reachability is not evidence of sandbox isolation or authorization.

See [`SKILL.md`](SKILL.md), [`references/mode-selection.md`](references/mode-selection.md), [`references/mcp-config.md`](references/mcp-config.md), and [`references/security.md`](references/security.md) for the operational policy.

## License

Released under the [MIT License](LICENSE).
