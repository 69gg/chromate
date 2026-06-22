import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ActionResult, ScreenshotResult } from "../types.js";

export function textResult(
  summary: string,
  structuredContent?: Record<string, unknown>
): CallToolResult {
  return {
    content: [{ type: "text", text: summary }],
    structuredContent
  };
}

export function imageResult(
  summary: string,
  png: Buffer,
  structuredContent?: Record<string, unknown>
): CallToolResult {
  return {
    content: [
      { type: "text", text: summary },
      { type: "image", data: png.toString("base64"), mimeType: "image/png" }
    ],
    structuredContent
  };
}

export function actionStructuredContent(result: ActionResult): Record<string, unknown> {
  return {
    tab: result.tab,
    viewport: result.viewport,
    screenshot: result.screenshot === undefined
      ? undefined
      : screenshotStructuredContent(result.screenshot)
  };
}

export function screenshotStructuredContent(result: ScreenshotResult): Record<string, unknown> {
  return {
    width: result.width,
    height: result.height,
    coordinateSystem: "css_viewport_pixels",
    viewport: result.viewport
  };
}
