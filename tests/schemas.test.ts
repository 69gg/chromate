import { describe, expect, it } from "vitest";
import { clickSchema, listTabsSchema, screenshotSchema } from "../src/tools/schemas.js";

describe("tool schemas", () => {
  it("applies list tab defaults", () => {
    expect(listTabsSchema.parse({})).toEqual({ includeInternal: false });
  });

  it("applies screenshot defaults", () => {
    expect(screenshotSchema.parse({})).toEqual({ overlay: "grid" });
  });

  it("applies click defaults", () => {
    expect(clickSchema.parse({ x: 10, y: 20 })).toEqual({
      x: 10,
      y: 20,
      button: "left",
      clickCount: 1,
      wait: "auto",
      returnScreenshot: true
    });
  });
});
