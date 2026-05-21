# Browser Chrome MCP config

The recommended Pi MCP setup has two logical servers using one wrapper command.

```json
{
  "mcpServers": {
    "browser-chrome-headed": {
      "command": "browser-chrome-mcp",
      "args": ["headed"],
      "lifecycle": "lazy",
      "env": {
        "CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS": "1"
      }
    },
    "browser-chrome-headless": {
      "command": "browser-chrome-mcp",
      "args": ["headless"],
      "lifecycle": "lazy",
      "idleTimeout": 1,
      "env": {
        "CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS": "1"
      }
    }
  }
}
```

`browser-chrome-mcp` calls `npx -y chrome-devtools-mcp@latest` by default.

Override package or npx command with:

```bash
export BROWSER_CHROME_MCP_PACKAGE=chrome-devtools-mcp@latest
export BROWSER_CHROME_NPX=npx
```

Run `scripts/install-local.sh` to install the skill and merge these MCP entries into `~/.pi/agent/mcp.json`.
