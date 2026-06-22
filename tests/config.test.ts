import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("loads defaults", () => {
    const config = loadConfig({});

    expect(config.cdpEndpoint).toBe("http://127.0.0.1:9222");
    expect(config.connectTimeoutMs).toBe(10_000);
    expect(config.gridStep).toBe(100);
  });

  it("loads env overrides", () => {
    const config = loadConfig({
      CHROMATE_CDP_ENDPOINT: "http://127.0.0.1:9444",
      CHROMATE_CONNECT_TIMEOUT_MS: "1234",
      CHROMATE_ACTION_TIMEOUT_MS: "5678",
      CHROMATE_SETTLE_DELAY_MS: "0",
      CHROMATE_GRID_STEP: "80",
      CHROMATE_LOG_LEVEL: "debug"
    });

    expect(config).toMatchObject({
      cdpEndpoint: "http://127.0.0.1:9444",
      connectTimeoutMs: 1234,
      actionTimeoutMs: 5678,
      settleDelayMs: 0,
      gridStep: 80,
      logLevel: "debug"
    });
  });
});
