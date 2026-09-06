# Browser Chrome MCP config

The recommended Pi MCP setup has one control/session server plus two DevTools servers. Agents should call `browser-chrome-control` first, then use the returned guidance to choose `browser-chrome-headed` or `browser-chrome-headless` for actual `chrome_devtools_*` actions.

```json
{
  "mcpServers": {
    "browser-chrome-control": {
      "command": "browser-chrome-control-mcp",
      "args": [],
      "lifecycle": "lazy"
    },
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

`browser-chrome-control` exposes these policy tools only:

- `browser_chrome_status`
- `browser_chrome_acquire_session`
- `browser_chrome_assert_persistent`
- `browser_chrome_release`

It is not a full `chrome-devtools-mcp` proxy. For browser actions, use the DevTools MCP server named in the control tool result.

`browser-chrome-mcp` runs the MCP package installed under the skill's `runtime/node_modules` directly through Node. It does not invoke npm/npx, change the caller's working directory, or resolve the caller's project dependencies.

Run `scripts/install-local.sh` to prepare the pinned runtime, install the skill, and merge the Pi MCP entries into `~/.pi/agent/mcp.json`. Run `scripts/install-runtime.sh` to prepare or repair a runtime in place for other clients. The version and complete dependency resolution are recorded in `runtime/package.json` and `runtime/package-lock.json`.

Use `BROWSER_CHROME_NODE` to select Node and `BROWSER_CHROME_NPM` to select npm during installation. The old `BROWSER_CHROME_NPX` and `BROWSER_CHROME_MCP_PACKAGE` startup overrides are no longer supported; update the runtime manifest and lockfile to select another reviewed MCP release.

For clients such as Codex that initialize MCP servers eagerly, configure `mcp.sh headed-connect` for the headed server. This starts the MCP transport without opening Chrome; acquire a persistent session through the control MCP before browser operations. `mcp.sh headed` retains the Pi lazy-start behavior. See the Codex configuration example in [README.md](../README.md#use-with-codex-or-another-mcp-client).
