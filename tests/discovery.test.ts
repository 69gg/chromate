import { describe, expect, it } from "vitest";
import type { ChromateConfig } from "../src/config.js";
import {
  buildLocalCdpCandidates,
  discoverLocalCdpEndpoint,
  fetchCdpVersion,
  probeCdpEndpoint
} from "../src/cdp/discovery.js";

describe("CDP discovery", () => {
  it("builds local candidates from configured ports", () => {
    expect(buildLocalCdpCandidates([9222, 9333])).toEqual([
      "http://127.0.0.1:9222",
      "http://localhost:9222",
      "http://127.0.0.1:9333",
      "http://localhost:9333"
    ]);
  });

  it("fetches CDP version metadata", async () => {
    const version = await fetchCdpVersion("http://127.0.0.1:9222", 100, async (input) => {
      expect(input.href).toBe("http://127.0.0.1:9222/json/version");
      return Response.json({
        Browser: "Chrome/1.0",
        webSocketDebuggerUrl: "ws://127.0.0.1:9222/devtools/browser/abc"
      });
    });

    expect(version?.webSocketDebuggerUrl).toBe("ws://127.0.0.1:9222/devtools/browser/abc");
  });

  it("ignores endpoints without websocket debugger url", async () => {
    const discovered = await probeCdpEndpoint("http://127.0.0.1:9222", 100, async () =>
      Response.json({ Browser: "Chrome/1.0" })
    );

    expect(discovered).toBeUndefined();
  });

  it("discovers the first local CDP endpoint", async () => {
    const config: ChromateConfig = {
      cdpDiscoveryPorts: [9222, 9333],
      discoveryTimeoutMs: 100,
      connectTimeoutMs: 1_000,
      actionTimeoutMs: 1_000,
      settleDelayMs: 0,
      gridStep: 100,
      logLevel: "silent"
    };

    const discovered = await discoverLocalCdpEndpoint(config, async (input) => {
      if (input.href === "http://127.0.0.1:9333/json/version") {
        return Response.json({
          Browser: "Chrome/1.0",
          webSocketDebuggerUrl: "ws://127.0.0.1:9333/devtools/browser/abc"
        });
      }

      return new Response("not found", { status: 404 });
    });

    expect(discovered.endpoint).toBe("http://127.0.0.1:9333");
    expect(discovered.webSocketDebuggerUrl).toBe("ws://127.0.0.1:9333/devtools/browser/abc");
  });
});
