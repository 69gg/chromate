# Security Notes

Chrome remote debugging gives full control over the browser profile that exposes it. Treat the CDP endpoint as sensitive. Chromate can auto-discover localhost CDP ports, so only expose remote debugging for browser profiles you are comfortable automating.

Recommended defaults:

- Bind Chrome remote debugging to `127.0.0.1`.
- Use a separate `--user-data-dir` for automation.
- Do not expose port `9222` to a LAN, container bridge, public IP, or reverse proxy.
- Avoid using your daily browser profile for untrusted tasks.

Chromate intentionally uses MCP stdio and writes logs to stderr only. stdout is reserved for MCP protocol messages.

The first version controls only web page content through CDP. Native browser UI and OS-level interactions are out of scope because they require broader permissions and different security boundaries.
