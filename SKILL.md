---
name: browser-chrome
description: Use when browser automation or Chrome DevTools debugging is needed. Prefer disposable headless Chrome for simple anonymous or parallel checks; use headed persistent Chrome only for login/logout, current auth, saved sessions, passwords, or profile data.
license: MIT
---

# Browser Chrome

Use this skill for Chrome browser automation, UI inspection, screenshots, console/network debugging, and Chrome DevTools MCP workflows.

## Contract

- Inputs: the browser automation or debugging need and whether authenticated, saved, or persistent session state is required.
- Outputs: a selected safe form (`headless-disposable` or `headed-persistent`) and the matching operational DevTools MCP server.
- Non-goals: reading or exporting passwords, cookies, tokens, or private profile files; silently using a personal profile; or claiming that DevTools access is sandbox isolation.

## Mode selection

Default to **headless** unless the task needs an authenticated/persistent browser state. When MCP is available, first use `browser-chrome-control` to make the policy explicit, then use the returned DevTools MCP server for actual browser actions.

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

- `scripts/control-mcp.sh` — MCP control/session policy server exposing `browser_chrome_*` tools.
- `scripts/check-opened.sh` — check whether headed or headless Chrome is reachable.
- `scripts/open-headed.sh` — open or reuse a headed persistent Chrome profile.
- `scripts/open-headless.sh` — open a fresh isolated headless Chrome with a unique profile and port.
- `scripts/close-headed-tab.sh` — close a headed browser tab/page by DevTools page id or URL substring.
- `scripts/close-headless.sh` — close a headless browser instance and remove its temporary profile.
- `scripts/mcp.sh` — wrapper used by MCP entries; exposed as `browser-chrome-mcp` by the installer.

## Headless protocol

For simple fetches and checks that do not need persistent session data:

1. Call `browser_chrome_acquire_session` on MCP server `browser-chrome-control` with `form: "headless-disposable"`.
2. Use the returned guidance: MCP server `browser-chrome-headless` for `chrome_devtools_*` actions.
3. A fresh headless Chrome instance must be created for the task by the headless MCP wrapper. It must use a unique port and temporary user-data-dir.
4. The instance may be local or remote via LAN, Tailscale, or SSH tunnel. If remote, `BROWSER_CHROME_HEADLESS_START_COMMAND` and `BROWSER_CHROME_HEADLESS_CLOSE_COMMAND` must define start and cleanup.
5. Do the browser work.
6. Close pages/tabs you opened when possible.
7. The wrapper must close the headless instance after the MCP server exits. If you manually opened headless with `scripts/open-headless.sh`, close it with `scripts/close-headless.sh <id>`.

Do not reuse a headless instance across unrelated or parallel agents.

## Headed persistent protocol

For tasks requiring auth/session/profile data:

1. Call `browser_chrome_acquire_session` on MCP server `browser-chrome-control` with `form: "headed-persistent"` and a short purpose, or call `browser_chrome_assert_persistent` when only validation is needed.
2. The control MCP acquires a cross-process advisory lease, delegates open/reuse to `scripts/open-headed.sh`, and verifies the endpoint.
3. Use the returned guidance: MCP server `browser-chrome-headed` for `chrome_devtools_*` actions.
4. Do not spawn duplicate headed Chrome for the same profile, and do not fall back to headless or disposable headed when saved auth/session/profile state is required.
5. Close only tabs/pages opened by the agent. Do not close the whole headed browser unless the user explicitly asks.
6. When done, call `browser_chrome_release` with the returned `leaseId`. Release only drops the control lease; it must not close the headed browser.

If the headed profile appears to be running but the DevTools endpoint is not reachable, stop and report the blocker instead of opening another browser with the same profile.

## MCP usage

Prefer the control-first flow:

```text
mcp({ server: "browser-chrome-control" })
# call browser_chrome_status, browser_chrome_acquire_session, or browser_chrome_assert_persistent
mcp({ server: "browser-chrome-headless" }) # for returned headless-disposable guidance
mcp({ server: "browser-chrome-headed" })   # for returned headed-persistent guidance
```

Then call the needed `chrome_devtools_*` tools exposed by the selected DevTools server. The control MCP is not a full `chrome-devtools-mcp` proxy.

## Safety

The headed browser may contain the user's active accounts, cookies, passwords, and private data. The default local headed profile is a dedicated profile under `BROWSER_CHROME_HOME`; it is not the normal personal Chrome profile. A custom endpoint or start command may still point to an authenticated profile, so that choice must be explicit.

- Do not inspect, export, print, or copy cookies, tokens, passwords, local storage, or private profile files unless the user explicitly asks.
- Do not silently attach to a personal profile or use headed mode for public/anonymous tasks.
- Do not perform account-changing or destructive actions without explicit user direction.
- Restrict DevTools endpoints to the intended host/network. Reachability is not sandbox isolation or authorization.
- Treat DevTools access as equivalent to controlling the user's browser session.

For more detail, read `references/mode-selection.md`, `references/mcp-config.md`, and `references/security.md`.
