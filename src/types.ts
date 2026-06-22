export interface ChromeTab {
  readonly tabId: string;
  readonly title: string;
  readonly url: string;
  readonly type: string;
  readonly attached: boolean;
  readonly selected: boolean;
}

export interface ViewportInfo {
  readonly width: number;
  readonly height: number;
  readonly deviceScaleFactor: number;
  readonly scrollX: number;
  readonly scrollY: number;
  readonly url: string;
  readonly title: string;
}

export interface ScreenshotResult {
  readonly png: Buffer;
  readonly width: number;
  readonly height: number;
  readonly viewport: ViewportInfo;
}

export interface Crosshair {
  readonly x: number;
  readonly y: number;
}

export type MouseButton = "left" | "middle" | "right";

export interface ClickOptions {
  readonly x: number;
  readonly y: number;
  readonly button: MouseButton;
  readonly clickCount: 1 | 2;
  readonly wait: "auto" | "none";
  readonly returnScreenshot: boolean;
}

export interface ActionResult {
  readonly tab: ChromeTab;
  readonly viewport: ViewportInfo;
  readonly screenshot?: ScreenshotResult;
}
