# Chromate MCP

Chromate MCP is a Model Context Protocol server for Chrome tab automation over the Chrome DevTools Protocol (CDP). It is designed for AI agents that work from screenshots: select a tab, inspect a coordinate grid, click CSS viewport coordinates, then receive an after screenshot.

## Capabilities

- Connect to Chrome remote debugging from a fixed endpoint, Chrome 144+ auto-connect metadata, or local CDP port discovery.
- List and select Chrome tabs by CDP target id.
- Capture viewport screenshots with an optional grid and crosshair overlay.
- Click, scroll, type text, press keys, wait, and read page/viewport info.
- Keep all coordinates in CSS viewport pixels, matching CDP mouse events.

Chromate controls the web page content area. It does not operate the Chrome address bar, native tab strip, extension popups, file pickers, or OS windows.

## Install

```bash
npm install
npm run build
```

## Start Chrome

Chromate does not launch Chrome automatically. It can connect to an already-running Chrome in two ways.

For Chrome 144+, open `chrome://inspect/#remote-debugging` in Chrome and enable remote debugging. Chromate reads Chrome's `DevToolsActivePort` metadata by default and connects to the running browser after Chrome shows and you approve the permission dialog.

For older Chrome versions or sandbox/VM setups, start Chrome with a remote debugging port:

```bash
google-chrome-stable \
  --remote-debugging-address=127.0.0.1 \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chromate-profile
```

Chromate auto-discovers local Chrome on ports `9222`, `9223`, `9224`, and `9333` when `CHROMATE_CDP_ENDPOINT` is not set. Any Chromium-based browser that exposes CDP can work if it supports `/json/version` and a browser-level WebSocket endpoint.

## MCP Configuration

Example client configuration:

```json
{
  "mcpServers": {
    "chromate": {
      "command": "node",
      "args": ["/data0/chromate/dist/index.js"],
      "env": {}
    }
  }
}
```

Set `CHROMATE_CDP_ENDPOINT` only when you want to force a specific CDP HTTP or WebSocket endpoint.

During development, use:

```bash
npm run dev
```

## Environment

- `CHROMATE_CDP_ENDPOINT`: CDP HTTP or WebSocket endpoint. If omitted, Chromate auto-discovers local CDP.
- `CHROMATE_AUTO_CONNECT`: read Chrome 144+ `DevToolsActivePort` metadata before scanning ports. Default: `true`
- `CHROMATE_AUTO_CONNECT_CHANNEL`: Chrome channel for default profile lookup: `stable`, `beta`, `dev`, or `canary`. Default: `stable`
- `CHROMATE_AUTO_CONNECT_USER_DATA_DIR`: explicit Chrome user data directory containing `DevToolsActivePort`
- `CHROMATE_CDP_DISCOVERY_PORTS`: comma-separated local ports to scan. Default: `9222,9223,9224,9333`
- `CHROMATE_DISCOVERY_TIMEOUT_MS`: per-port discovery timeout. Default: `350`
- `CHROMATE_CONNECT_TIMEOUT_MS`: connection timeout. Default: `10000`
- `CHROMATE_ACTION_TIMEOUT_MS`: command timeout. Default: `30000`
- `CHROMATE_SETTLE_DELAY_MS`: wait after auto actions. Default: `500`
- `CHROMATE_GRID_STEP`: screenshot grid spacing. Default: `100`
- `CHROMATE_LOG_LEVEL`: `silent`, `error`, `info`, or `debug`. Default: `info`

## Workflow

1. Call `list_tabs`.
2. Call `select_tab` with the desired `tabId`.
3. Call `screenshot` and inspect the grid.
4. Call `click` with CSS viewport coordinates.
5. Use the returned after screenshot to continue.

See [docs/tool-contract.md](docs/tool-contract.md) for the full tool contract.
