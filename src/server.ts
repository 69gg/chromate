import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ChromateConfig } from "./config.js";
import { ChromeAutomation } from "./cdp/chrome-automation.js";
import { registerTools } from "./tools/register.js";

export interface ChromateServer {
  readonly server: McpServer;
  readonly automation: ChromeAutomation;
}

export function createChromateServer(config: ChromateConfig): ChromateServer {
  const server = new McpServer({
    name: "chromate-mcp",
    version: "0.1.0"
  });
  const automation = new ChromeAutomation(config);

  registerTools(server, automation, config);
  return { server, automation };
}
