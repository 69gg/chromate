# Development

## Project Structure

- `src/cdp`: CDP connection and browser automation.
- `src/tools`: MCP tool schemas and registrations.
- `src/screenshot`: screenshot overlay rendering.
- `src/mcp`: MCP result helpers.
- `tests`: unit and fake-CDP integration tests.

## Commands

```bash
npm install
npm run typecheck
npm test
npm run build
```

## Design Notes

Chromate talks to the browser-level CDP WebSocket. If `CHROMATE_CDP_ENDPOINT` is set, it resolves that HTTP endpoint through `/json/version` or uses the WebSocket URL directly. By default, it reads Chrome 144+ `DevToolsActivePort` metadata from the selected profile and connects to that WebSocket. If `CHROMATE_AUTO_CONNECT=false`, it probes configured localhost ports and uses the first endpoint that returns `webSocketDebuggerUrl`. It lists tabs with `Target.getTargets`, activates a tab with `Target.activateTarget`, attaches with `Target.attachToTarget` using `flatten: true`, and sends page commands through the returned session id.

The screenshot coordinate system is CSS viewport pixels. `Page.captureScreenshot` captures the page viewport and `Input.dispatchMouseEvent` consumes the same coordinate space.

Grid overlays are generated as SVG and composited onto PNG screenshots with Sharp. This keeps overlay rendering deterministic and avoids custom pixel manipulation.
