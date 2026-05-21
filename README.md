# browser-chrome skill

A portable Agent Skills package for using Chrome through Chrome DevTools MCP.

- Skill name: `browser-chrome`
- MCP wrapper: `browser-chrome-mcp`
- MCP package: `chrome-devtools-mcp@latest`

## Install for Pi locally

```bash
scripts/install-local.sh
```

This installs:

- the skill to `~/.pi/agent/skills/browser-chrome`;
- wrapper commands to `~/.local/bin`;
- two MCP entries to `~/.pi/agent/mcp.json`:
  - `browser-chrome-headed`
  - `browser-chrome-headless`

Restart Pi or reconnect MCP after installation.

## Install with skills CLI

The skill itself can be installed with the Vercel Labs `skills` CLI:

```bash
npx skills add ./browser-chrome-skill --skill browser-chrome --agent pi --global --yes
```

The skills CLI installs the skill instructions. Run `scripts/install-local.sh` when you also want MCP entries and wrapper commands.

## Modes

### Headless

Use for public, anonymous, local, simple, and parallel browser checks. Each run gets a fresh profile and unique port. The MCP wrapper closes it after use.

### Headed

Use for tasks requiring login/logout, current auth, saved sessions, saved passwords, extensions, or persistent profile data. The wrapper checks for an existing reachable browser before opening a new one.

## Important environment variables

```bash
# Headed browser endpoint used by MCP.
BROWSER_CHROME_HEADED_URL=http://127.0.0.1:9233

# Local headed browser launch settings.
BROWSER_CHROME_HEADED_PORT=9233
BROWSER_CHROME_HEADED_BIND_ADDRESS=127.0.0.1
BROWSER_CHROME_HEADED_USER_DATA_DIR=$HOME/.cache/browser-chrome/headed-profile
BROWSER_CHROME_HEADED_PROFILE_DIRECTORY=Default

# Optional custom start command for remote hosts.
BROWSER_CHROME_HEADED_START_COMMAND='ssh desktop-host browser-chrome-open-headed'

# Chrome binary and MCP package.
BROWSER_CHROME_BIN=google-chrome-stable
BROWSER_CHROME_MCP_PACKAGE=chrome-devtools-mcp@latest
```

For LAN/Tailscale use, set `BROWSER_CHROME_HEADED_URL` and `BROWSER_CHROME_HEADED_BIND_ADDRESS` deliberately.
