import sharp from "sharp";
import type { Crosshair, ScreenshotResult } from "../types.js";

export interface OverlayOptions {
  readonly mode: "grid" | "none";
  readonly gridStep: number;
  readonly crosshair?: Crosshair;
}

export async function renderOverlayScreenshot(
  screenshot: ScreenshotResult,
  options: OverlayOptions
): Promise<Buffer> {
  if (options.mode === "none" && options.crosshair === undefined) {
    return screenshot.png;
  }

  const overlay = Buffer.from(
    buildOverlaySvg(screenshot.width, screenshot.height, options),
    "utf8"
  );

  return await sharp(screenshot.png)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png()
    .toBuffer();
}

export function buildOverlaySvg(
  width: number,
  height: number,
  options: OverlayOptions
): string {
  const safeWidth = Math.max(1, Math.floor(width));
  const safeHeight = Math.max(1, Math.floor(height));
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${safeWidth}" height="${safeHeight}" viewBox="0 0 ${safeWidth} ${safeHeight}">`
  ];

  if (options.mode === "grid") {
    parts.push(...buildGrid(safeWidth, safeHeight, options.gridStep));
  }

  if (options.crosshair !== undefined) {
    parts.push(buildCrosshair(safeWidth, safeHeight, options.crosshair));
  }

  parts.push("</svg>");
  return parts.join("");
}

function buildGrid(width: number, height: number, gridStep: number): string[] {
  const step = Math.max(20, gridStep);
  const parts: string[] = [
    `<rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="rgba(0,0,0,0.45)" stroke-width="1"/>`
  ];

  for (let x = 0; x <= width; x += step) {
    parts.push(
      `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="rgba(0,0,0,0.30)" stroke-width="1"/>`,
      `<text x="${Math.min(x + 4, width - 28)}" y="14" font-size="12" font-family="monospace" fill="black" paint-order="stroke" stroke="white" stroke-width="3">${x}</text>`
    );
  }

  for (let y = 0; y <= height; y += step) {
    parts.push(
      `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="rgba(0,0,0,0.30)" stroke-width="1"/>`,
      `<text x="4" y="${Math.max(14, y - 4)}" font-size="12" font-family="monospace" fill="black" paint-order="stroke" stroke="white" stroke-width="3">${y}</text>`
    );
  }

  return parts;
}

function buildCrosshair(width: number, height: number, crosshair: Crosshair): string {
  const x = clamp(crosshair.x, 0, width);
  const y = clamp(crosshair.y, 0, height);
  const labelX = clamp(x + 8, 0, width - 80);
  const labelY = clamp(y - 8, 16, height);

  return [
    `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#ff2d20" stroke-width="2" stroke-dasharray="8 6"/>`,
    `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="#ff2d20" stroke-width="2" stroke-dasharray="8 6"/>`,
    `<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="#ff2d20" stroke-width="3"/>`,
    `<text x="${labelX}" y="${labelY}" font-size="14" font-family="monospace" fill="#ff2d20" paint-order="stroke" stroke="white" stroke-width="4">(${Math.round(x)}, ${Math.round(y)})</text>`
  ].join("");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
