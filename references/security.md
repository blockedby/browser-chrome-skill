# Browser Chrome security notes

Chrome DevTools access is powerful. A client connected to the debug endpoint can inspect pages and control the browser.

## Persistent headed browser

The headed browser may contain live accounts, cookies, passwords, private pages, and internal services. Select `headed-persistent` only after an explicit control-MCP acquire/assert step and a deliberate profile or endpoint configuration.

The default local profile is a dedicated profile under `BROWSER_CHROME_HOME`; it is not the normal personal Chrome profile. A custom `BROWSER_CHROME_HEADED_USER_DATA_DIR`, endpoint, or start command can still point to an authenticated profile. Never silently attach to a personal profile, and do not treat endpoint reachability as proof that the profile is safe or isolated.

Rules for agents:

- Do not inspect, dump, print, or exfiltrate cookies, tokens, local/session storage, passwords, or private profile files unless explicitly requested.
- Do not use headed mode for public/anonymous tasks.
- Do not perform account-changing or destructive actions without explicit user direction.
- Close only tabs/pages opened for the task; do not close the entire persistent browser.
- Release the control lease when finished. Releasing it does not close the whole headed browser.

## Network exposure

Debug endpoints can be configured for localhost, LAN, Tailscale, or an SSH tunnel. Choose the exposure based on your threat model and restrict access to the intended host/network. DevTools access is not sandbox isolation or authorization.

Useful variables:

```bash
BROWSER_CHROME_HEADED_URL=http://127.0.0.1:9233
BROWSER_CHROME_HEADED_BIND_ADDRESS=127.0.0.1
BROWSER_CHROME_HEADED_PORT=9233

BROWSER_CHROME_HEADLESS_START_COMMAND='ssh desktop-host /path/to/browser-chrome/scripts/open-headless.sh'
BROWSER_CHROME_HEADLESS_CLOSE_COMMAND='ssh desktop-host /path/to/browser-chrome/scripts/close-headless.sh "$BROWSER_CHROME_ID"'
```

For remote operation, configure both reachable URLs/start commands and cleanup commands deliberately. Do not put credentials, tokens, or other secrets in MCP arguments, lease purposes, or command output.

## Headless browser

Headless instances are disposable. They use temporary profiles and unique ports, and should be closed after use. If a remote start command is used, configure a matching close command so cleanup still happens.
