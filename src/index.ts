#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createChromateServer } from "./server.js";
import { Logger } from "./utils/logger.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = new Logger(config.logLevel);
  const { server, automation } = createChromateServer(config);

  const shutdown = async (): Promise<void> => {
    await automation.close();
  };

  process.once("SIGINT", () => {
    void shutdown().finally(() => process.exit(0));
  });
  process.once("SIGTERM", () => {
    void shutdown().finally(() => process.exit(0));
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info(`Chromate MCP connected to ${config.cdpEndpoint}`);
}

main().catch((error: unknown) => {
  console.error("[chromate] fatal error", error);
  process.exit(1);
});
