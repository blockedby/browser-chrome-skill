---
name: browser-chrome
description: Use when browser automation or Chrome DevTools debugging is needed. Prefer disposable headless Chrome for simple anonymous or parallel checks; use headed persistent Chrome only for login/logout, current auth, saved sessions, passwords, or profile data.
---

# Browser Chrome

Use this skill for Chrome browser automation, UI inspection, screenshots, console/network debugging, and Chrome DevTools MCP workflows.

## Mode selection

Default to **headless** unless the task needs an authenticated/persistent browser state.

Use **headless** when:

- the page is public or anonymous;
- the task is a simple fetch, screenshot, responsive/mobile check, or local UI smoke test;
- multiple agents may run in parallel;
- current user cookies, saved passwords, or existing sessions are not required.

Use **headed** when:

- the task requires login/logout;
- the task requires current auth in external or internal services;
- the task needs saved cookies, passwords, autofill, extensions, or persistent profile data;
- the user explicitly asks to use the existing browser session/profile.

## Scripts

Resolve script paths relative to this skill directory.

- `scripts/check-opened.sh` — check whether headed or headless Chrome is reachable.
- `scripts/open-headed.sh` — open or reuse a headed persistent Chrome profile.
- `scripts/open-headless.sh` — open a fresh isolated headless Chrome with a unique profile and port.
- `scripts/close-headed-tab.sh` — close a headed browser tab/page by DevTools page id or URL substring.
- `scripts/close-headless.sh` — close a headless browser instance and remove its temporary profile.
- `scripts/mcp.sh` — wrapper used by MCP entries; exposed as `browser-chrome-mcp` by the installer.

## Headless protocol

For simple fetches and checks that do not need persistent session data:

1. Use MCP server `browser-chrome-headless`.
2. A fresh headless Chrome instance must be created for the task. It must use a unique port and temporary user-data-dir.
3. Do the browser work.
4. Close pages/tabs you opened when possible.
5. The wrapper must close the headless instance after the MCP server exits. If you manually opened headless with `scripts/open-headless.sh`, close it with `scripts/close-headless.sh <id>`.

Do not reuse a headless instance across unrelated or parallel agents.

## Headed persistent protocol

For tasks requiring auth/session/profile data:

1. Run `scripts/check-opened.sh headed`.
2. If reachable, reuse the running browser.
3. If not reachable, run `scripts/open-headed.sh`.
4. Use MCP server `browser-chrome-headed`.
5. Do not spawn duplicate headed Chrome for the same profile.
6. Close only tabs/pages opened by the agent. Do not close the whole headed browser unless the user explicitly asks.

If the headed profile appears to be running but the DevTools endpoint is not reachable, stop and report the blocker instead of opening another browser with the same profile.

## MCP usage

Prefer the Pi MCP proxy tool:

```text
mcp({ server: "browser-chrome-headless" })
mcp({ server: "browser-chrome-headed" })
```

Then call the needed `chrome_devtools_*` tools exposed by the selected server.

## Safety

The headed browser may contain the user's active accounts, cookies, passwords, and private data.

- Do not inspect, export, print, or copy cookies, tokens, passwords, local storage, or private profile files unless the user explicitly asks.
- Do not use headed mode for anonymous/public tasks.
- Do not perform destructive account actions unless explicitly requested.
- Treat DevTools access as equivalent to controlling the user's browser session.

For more detail, read `references/mode-selection.md`, `references/mcp-config.md`, and `references/security.md`.
