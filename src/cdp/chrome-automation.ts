import type { ChromateConfig } from "../config.js";
import type {
  ActionResult,
  ChromeTab,
  ClickOptions,
  MouseButton,
  ScreenshotResult,
  ViewportInfo
} from "../types.js";
import { delay } from "../utils/time.js";
import { CdpConnection, type CdpTransport } from "./connection.js";
import type {
  AttachToTargetResult,
  CaptureScreenshotResult,
  EvaluateResult,
  GetTargetsResult
} from "./protocol.js";

interface SelectedTab {
  readonly tab: ChromeTab;
  readonly sessionId: string;
}

interface PageMetricsPayload {
  readonly width: number;
  readonly height: number;
  readonly deviceScaleFactor: number;
  readonly scrollX: number;
  readonly scrollY: number;
  readonly url: string;
  readonly title: string;
  readonly readyState: string;
}

const pageMetricsExpression = `(() => ({
  width: Math.max(1, Math.floor(window.innerWidth)),
  height: Math.max(1, Math.floor(window.innerHeight)),
  deviceScaleFactor: window.devicePixelRatio || 1,
  scrollX: Math.floor(window.scrollX || 0),
  scrollY: Math.floor(window.scrollY || 0),
  url: location.href,
  title: document.title,
  readyState: document.readyState
}))()`;

export class ChromeAutomation {
  private readonly connection: CdpTransport;
  private selected: SelectedTab | undefined;

  public constructor(
    private readonly config: ChromateConfig,
    connection?: CdpTransport
  ) {
    this.connection = connection ?? new CdpConnection(config);
  }

  public async close(): Promise<void> {
    await this.connection.close();
  }

  public async listTabs(includeInternal = false): Promise<ChromeTab[]> {
    const result = await this.connection.send<GetTargetsResult>("Target.getTargets");
    return result.targetInfos
      .filter((target) => includeInternal || target.type === "page")
      .map((target) => ({
        tabId: target.targetId,
        title: target.title,
        url: target.url,
        type: target.type,
        attached: target.attached,
        selected: target.targetId === this.selected?.tab.tabId
      }));
  }

  public async selectTab(tabId: string, activate = true): Promise<ChromeTab> {
    const tabs = await this.listTabs(true);
    const tab = tabs.find((candidate) => candidate.tabId === tabId);
    if (tab === undefined) {
      throw new Error(`No Chrome tab found for tabId ${tabId}`);
    }

    if (activate) {
      await this.connection.send("Target.activateTarget", { targetId: tabId });
    }

    const attached = await this.connection.send<AttachToTargetResult>("Target.attachToTarget", {
      targetId: tabId,
      flatten: true
    });

    this.selected = { tab: { ...tab, selected: true }, sessionId: attached.sessionId };
    await this.connection.send("Page.enable", {}, attached.sessionId);
    await this.connection.send("Runtime.enable", {}, attached.sessionId);
    return this.selected.tab;
  }

  public async getSelectedTab(): Promise<ChromeTab> {
    return (await this.requireSelected()).tab;
  }

  public async getPageInfo(): Promise<ActionResult> {
    const selected = await this.requireSelected();
    const viewport = await this.getViewportInfo(selected.sessionId);
    return {
      tab: await this.refreshSelectedTab(selected.tab.tabId),
      viewport
    };
  }

  public async screenshot(): Promise<ScreenshotResult> {
    const selected = await this.requireSelected();
    const viewport = await this.getViewportInfo(selected.sessionId);
    const captured = await this.connection.send<CaptureScreenshotResult>(
      "Page.captureScreenshot",
      {
        format: "png",
        fromSurface: true,
        captureBeyondViewport: false
      },
      selected.sessionId
    );

    return {
      png: Buffer.from(captured.data, "base64"),
      width: viewport.width,
      height: viewport.height,
      viewport
    };
  }

  public async click(options: ClickOptions): Promise<ActionResult> {
    const selected = await this.requireSelected();
    const viewport = await this.getViewportInfo(selected.sessionId);
    this.assertPointInViewport(options.x, options.y, viewport);

    await this.dispatchMouseClick(
      selected.sessionId,
      options.x,
      options.y,
      options.button,
      options.clickCount
    );

    if (options.wait === "auto") {
      await this.waitForStablePage(selected.sessionId);
    }

    return {
      tab: await this.refreshSelectedTab(selected.tab.tabId),
      viewport: await this.getViewportInfo(selected.sessionId),
      screenshot: options.returnScreenshot ? await this.screenshot() : undefined
    };
  }

  public async scroll(deltaX: number, deltaY: number, x?: number, y?: number): Promise<ActionResult> {
    const selected = await this.requireSelected();
    const viewport = await this.getViewportInfo(selected.sessionId);
    const pointX = x ?? Math.floor(viewport.width / 2);
    const pointY = y ?? Math.floor(viewport.height / 2);
    this.assertPointInViewport(pointX, pointY, viewport);

    await this.connection.send(
      "Input.dispatchMouseEvent",
      {
        type: "mouseWheel",
        x: pointX,
        y: pointY,
        deltaX,
        deltaY
      },
      selected.sessionId
    );

    await this.waitForStablePage(selected.sessionId);
    return this.getPageInfo();
  }

  public async typeText(text: string): Promise<ActionResult> {
    const selected = await this.requireSelected();
    await this.connection.send("Input.insertText", { text }, selected.sessionId);
    await this.waitForStablePage(selected.sessionId);
    return this.getPageInfo();
  }

  public async pressKey(key: string): Promise<ActionResult> {
    const selected = await this.requireSelected();
    await this.connection.send(
      "Input.dispatchKeyEvent",
      {
        type: "keyDown",
        key
      },
      selected.sessionId
    );
    await this.connection.send(
      "Input.dispatchKeyEvent",
      {
        type: "keyUp",
        key
      },
      selected.sessionId
    );
    await this.waitForStablePage(selected.sessionId);
    return this.getPageInfo();
  }

  public async wait(text?: string, timeoutMs?: number): Promise<ActionResult> {
    const selected = await this.requireSelected();

    if (text !== undefined && text.trim() !== "") {
      await this.waitForText(selected.sessionId, text, timeoutMs ?? this.config.actionTimeoutMs);
    } else {
      await this.waitForStablePage(selected.sessionId);
    }

    return this.getPageInfo();
  }

  private async requireSelected(): Promise<SelectedTab> {
    if (this.selected !== undefined) {
      return this.selected;
    }

    const tabs = await this.listTabs();
    const first = tabs[0];
    if (first === undefined) {
      throw new Error("No Chrome page tabs are available");
    }

    await this.selectTab(first.tabId, true);
    if (this.selected === undefined) {
      throw new Error("Failed to select the first Chrome tab");
    }

    return this.selected;
  }

  private async refreshSelectedTab(tabId: string): Promise<ChromeTab> {
    const tabs = await this.listTabs(true);
    const tab = tabs.find((candidate) => candidate.tabId === tabId);
    if (tab === undefined) {
      throw new Error(`Selected Chrome tab no longer exists: ${tabId}`);
    }

    this.selected = this.selected === undefined
      ? undefined
      : { ...this.selected, tab: { ...tab, selected: true } };

    return { ...tab, selected: true };
  }

  private async getViewportInfo(sessionId: string): Promise<ViewportInfo> {
    const evaluated = await this.connection.send<EvaluateResult<PageMetricsPayload>>(
      "Runtime.evaluate",
      {
        expression: pageMetricsExpression,
        returnByValue: true,
        awaitPromise: true
      },
      sessionId
    );

    if (evaluated.exceptionDetails !== undefined || evaluated.result.value === undefined) {
      throw new Error("Failed to evaluate page viewport metrics");
    }

    const metrics = evaluated.result.value;
    return {
      width: metrics.width,
      height: metrics.height,
      deviceScaleFactor: metrics.deviceScaleFactor,
      scrollX: metrics.scrollX,
      scrollY: metrics.scrollY,
      url: metrics.url,
      title: metrics.title
    };
  }

  private assertPointInViewport(x: number, y: number, viewport: ViewportInfo): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error("Coordinates must be finite numbers");
    }

    if (x < 0 || y < 0 || x > viewport.width || y > viewport.height) {
      throw new Error(
        `Coordinates (${x}, ${y}) are outside the viewport ${viewport.width}x${viewport.height}`
      );
    }
  }

  private async dispatchMouseClick(
    sessionId: string,
    x: number,
    y: number,
    button: MouseButton,
    clickCount: 1 | 2
  ): Promise<void> {
    await this.connection.send(
      "Input.dispatchMouseEvent",
      {
        type: "mousePressed",
        x,
        y,
        button,
        clickCount
      },
      sessionId
    );
    await this.connection.send(
      "Input.dispatchMouseEvent",
      {
        type: "mouseReleased",
        x,
        y,
        button,
        clickCount
      },
      sessionId
    );
  }

  private async waitForStablePage(sessionId: string): Promise<void> {
    await delay(this.config.settleDelayMs);
    await this.connection.send(
      "Runtime.evaluate",
      {
        expression: "document.readyState",
        returnByValue: true
      },
      sessionId
    );
  }

  private async waitForText(sessionId: string, text: string, timeoutMs: number): Promise<void> {
    const startedAt = Date.now();
    const escapedText = JSON.stringify(text);
    const expression = `document.body?.innerText?.includes(${escapedText}) ?? false`;

    while (Date.now() - startedAt < timeoutMs) {
      const evaluated = await this.connection.send<EvaluateResult<boolean>>(
        "Runtime.evaluate",
        {
          expression,
          returnByValue: true
        },
        sessionId
      );

      if (evaluated.result.value === true) {
        return;
      }

      await delay(Math.min(250, this.config.settleDelayMs));
    }

    throw new Error(`Timed out waiting for text: ${text}`);
  }
}
