import { describe, expect, it } from "vitest";
import type { ChromateConfig } from "../src/config.js";
import { ChromeAutomation } from "../src/cdp/chrome-automation.js";
import type { CdpTransport } from "../src/cdp/connection.js";

interface RecordedCommand {
  readonly method: string;
  readonly params?: Record<string, unknown>;
  readonly sessionId?: string;
}

const onePixelPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

describe("ChromeAutomation", () => {
  it("selects a tab and dispatches a coordinate click", async () => {
    const transport = new FakeCdpTransport();
    const automation = new ChromeAutomation(testConfig(), transport);

    const tabs = await automation.listTabs();
    expect(tabs).toHaveLength(1);

    await automation.selectTab("tab-1");
    await automation.click({
      x: 25,
      y: 30,
      button: "left",
      clickCount: 1,
      wait: "none",
      returnScreenshot: true
    });

    expect(transport.commands.map((command) => command.method)).toContain("Target.activateTarget");
    expect(transport.commands).toContainEqual(
      expect.objectContaining({
        method: "Input.dispatchMouseEvent",
        params: expect.objectContaining({ type: "mousePressed", x: 25, y: 30 })
      })
    );
  });
});

function testConfig(): ChromateConfig {
  return {
    cdpEndpoint: "http://127.0.0.1:9222",
    cdpDiscoveryPorts: [9222],
    discoveryTimeoutMs: 100,
    connectTimeoutMs: 1_000,
    actionTimeoutMs: 1_000,
    settleDelayMs: 0,
    gridStep: 100,
    logLevel: "silent"
  };
}

class FakeCdpTransport implements CdpTransport {
  public readonly commands: RecordedCommand[] = [];

  public async connect(): Promise<void> {}

  public async close(): Promise<void> {}

  public async send<T>(
    method: string,
    params?: Record<string, unknown>,
    sessionId?: string
  ): Promise<T> {
    this.commands.push({ method, params, sessionId });
    return fakeResult(method) as T;
  }
}

function fakeResult(method: string): Record<string, unknown> {
  switch (method) {
    case "Target.getTargets":
      return {
        targetInfos: [
          {
            targetId: "tab-1",
            type: "page",
            title: "Example",
            url: "https://example.test/",
            attached: false
          }
        ]
      };
    case "Target.attachToTarget":
      return { sessionId: "session-1" };
    case "Runtime.evaluate":
      return {
        result: {
          type: "object",
          value: {
            width: 800,
            height: 600,
            deviceScaleFactor: 1,
            scrollX: 0,
            scrollY: 0,
            url: "https://example.test/",
            title: "Example",
            readyState: "complete"
          }
        }
      };
    case "Page.captureScreenshot":
      return { data: onePixelPngBase64 };
    default:
      return {};
  }
}
