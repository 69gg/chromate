import { describe, expect, it } from "vitest";
import { buildOverlaySvg, renderOverlayScreenshot } from "../src/screenshot/overlay.js";
import type { ScreenshotResult } from "../src/types.js";

describe("buildOverlaySvg", () => {
  it("renders grid labels and crosshair", () => {
    const svg = buildOverlaySvg(300, 200, {
      mode: "grid",
      gridStep: 100,
      crosshair: { x: 120, y: 80 }
    });

    expect(svg).toContain('width="300"');
    expect(svg).toContain(">100</text>");
    expect(svg).toContain('cx="120"');
    expect(svg).toContain("(120, 80)");
  });

  it("omits grid when mode is none", () => {
    const svg = buildOverlaySvg(300, 200, {
      mode: "none",
      gridStep: 100
    });

    expect(svg).not.toContain("stroke-dasharray");
    expect(svg).not.toContain(">100</text>");
  });

  it("renders an overlaid PNG", async () => {
    const screenshot: ScreenshotResult = {
      png: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
        "base64"
      ),
      width: 1,
      height: 1,
      viewport: {
        width: 1,
        height: 1,
        deviceScaleFactor: 1,
        scrollX: 0,
        scrollY: 0,
        url: "https://example.test/",
        title: "Example"
      }
    };

    const output = await renderOverlayScreenshot(screenshot, {
      mode: "grid",
      gridStep: 100,
      crosshair: { x: 0, y: 0 }
    });

    expect(output.subarray(1, 4).toString("ascii")).toBe("PNG");
  });
});
