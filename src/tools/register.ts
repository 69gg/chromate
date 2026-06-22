import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ChromateConfig } from "../config.js";
import type { ChromeAutomation } from "../cdp/chrome-automation.js";
import {
  actionStructuredContent,
  imageResult,
  screenshotStructuredContent,
  textResult
} from "../mcp/result.js";
import { renderOverlayScreenshot } from "../screenshot/overlay.js";
import {
  clickSchema,
  emptySchema,
  listTabsSchema,
  pressKeySchema,
  screenshotSchema,
  scrollSchema,
  selectTabSchema,
  typeTextSchema,
  waitSchema
} from "./schemas.js";

export function registerTools(
  server: McpServer,
  automation: ChromeAutomation,
  config: ChromateConfig
): void {
  server.registerTool(
    "list_tabs",
    {
      title: "List Chrome Tabs",
      description: "List Chrome tabs available through the configured CDP endpoint.",
      inputSchema: listTabsSchema
    },
    async ({ includeInternal }) => {
      const tabs = await automation.listTabs(includeInternal);
      return textResult(`Found ${tabs.length} Chrome tab(s).`, { tabs });
    }
  );

  server.registerTool(
    "select_tab",
    {
      title: "Select Chrome Tab",
      description: "Select the active tab for subsequent Chromate tools.",
      inputSchema: selectTabSchema
    },
    async ({ tabId, activate }) => {
      const tab = await automation.selectTab(tabId, activate);
      return textResult(`Selected tab: ${tab.title || tab.url}`, { tab });
    }
  );

  server.registerTool(
    "page_info",
    {
      title: "Get Page Info",
      description: "Return information about the currently selected page and viewport.",
      inputSchema: emptySchema
    },
    async () => {
      const result = await automation.getPageInfo();
      return textResult("Current page info.", actionStructuredContent(result));
    }
  );

  server.registerTool(
    "screenshot",
    {
      title: "Take Screenshot",
      description: "Capture the selected tab viewport using CSS viewport pixel coordinates.",
      inputSchema: screenshotSchema
    },
    async ({ overlay, crosshair }) => {
      const screenshot = await automation.screenshot();
      const rendered = await renderOverlayScreenshot(screenshot, {
        mode: overlay,
        gridStep: config.gridStep,
        crosshair
      });

      return imageResult(
        `Screenshot ${screenshot.width}x${screenshot.height}; coordinates are CSS viewport pixels.`,
        rendered,
        screenshotStructuredContent(screenshot)
      );
    }
  );

  server.registerTool(
    "click",
    {
      title: "Click Coordinates",
      description: "Click at CSS viewport coordinates in the selected tab, then wait and return an after screenshot.",
      inputSchema: clickSchema
    },
    async ({ x, y, button, clickCount, wait, returnScreenshot }) => {
      const result = await automation.click({ x, y, button, clickCount, wait, returnScreenshot });
      if (!returnScreenshot || result.screenshot === undefined) {
        return textResult(`Clicked (${x}, ${y}).`, actionStructuredContent(result));
      }

      const rendered = await renderOverlayScreenshot(result.screenshot, {
        mode: "grid",
        gridStep: config.gridStep,
        crosshair: { x, y }
      });

      return imageResult(
        `Clicked (${x}, ${y}); after screenshot returned.`,
        rendered,
        actionStructuredContent(result)
      );
    }
  );

  server.registerTool(
    "scroll",
    {
      title: "Scroll Page",
      description: "Dispatch a mouse wheel event in the selected tab.",
      inputSchema: scrollSchema
    },
    async ({ deltaX, deltaY, x, y }) => {
      const result = await automation.scroll(deltaX, deltaY, x, y);
      return textResult("Scroll completed.", actionStructuredContent(result));
    }
  );

  server.registerTool(
    "type_text",
    {
      title: "Type Text",
      description: "Insert text into the focused element in the selected tab.",
      inputSchema: typeTextSchema
    },
    async ({ text }) => {
      const result = await automation.typeText(text);
      return textResult("Text inserted.", actionStructuredContent(result));
    }
  );

  server.registerTool(
    "press_key",
    {
      title: "Press Key",
      description: "Dispatch a keyDown/keyUp pair to the selected tab.",
      inputSchema: pressKeySchema
    },
    async ({ key }) => {
      const result = await automation.pressKey(key);
      return textResult(`Pressed key: ${key}.`, actionStructuredContent(result));
    }
  );

  server.registerTool(
    "wait",
    {
      title: "Wait",
      description: "Wait for page stability or for visible body text to appear.",
      inputSchema: waitSchema
    },
    async ({ text, timeoutMs }) => {
      const result = await automation.wait(text, timeoutMs);
      return textResult("Wait completed.", actionStructuredContent(result));
    }
  );
}
