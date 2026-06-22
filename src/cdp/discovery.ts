import { readFile } from "node:fs/promises";
import { homedir, platform } from "node:os";
import path from "node:path";
import type { ChromateConfig } from "../config.js";

export interface CdpVersion {
  readonly Browser?: string;
  readonly webSocketDebuggerUrl?: string;
}

export interface DiscoveredCdpEndpoint {
  readonly endpoint: string;
  readonly webSocketDebuggerUrl: string;
  readonly browser?: string;
}

export interface DevToolsActivePort {
  readonly userDataDir: string;
  readonly webSocketDebuggerUrl: string;
}

type FetchLike = (input: URL, init?: RequestInit) => Promise<Response>;

export function buildLocalCdpCandidates(ports: readonly number[]): string[] {
  return ports.flatMap((port) => [
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`
  ]);
}

export async function discoverLocalCdpEndpoint(
  config: ChromateConfig,
  fetchImpl: FetchLike = fetch
): Promise<DiscoveredCdpEndpoint> {
  const candidates = buildLocalCdpCandidates(config.cdpDiscoveryPorts);
  const results = await Promise.all(
    candidates.map((endpoint) =>
      probeCdpEndpoint(endpoint, config.discoveryTimeoutMs, fetchImpl).catch(() => undefined)
    )
  );
  const discovered = results.find((result): result is DiscoveredCdpEndpoint => result !== undefined);

  if (discovered !== undefined) {
    return discovered;
  }

  throw new Error(
    `Could not auto-discover local Chrome CDP endpoint. Checked: ${candidates.join(", ")}. ` +
      "Start Chrome with --remote-debugging-port=9222 or set CHROMATE_CDP_ENDPOINT."
  );
}

export async function discoverAutoConnectEndpoint(
  config: ChromateConfig
): Promise<DiscoveredCdpEndpoint> {
  const activePort = await readDevToolsActivePort(resolveAutoConnectUserDataDir(config));
  return {
    endpoint: activePort.userDataDir,
    webSocketDebuggerUrl: activePort.webSocketDebuggerUrl
  };
}

export function resolveAutoConnectUserDataDir(config: ChromateConfig): string {
  if (config.autoConnectUserDataDir !== undefined) {
    return config.autoConnectUserDataDir;
  }

  return getChromeUserDataDir(config.autoConnectChannel);
}

export function getChromeUserDataDir(channel: ChromateConfig["autoConnectChannel"]): string {
  const currentPlatform = platform();
  if (currentPlatform === "win32") {
    const localAppData = process.env.LOCALAPPDATA ?? path.join(homedir(), "AppData", "Local");
    const productDir = {
      stable: path.join("Google", "Chrome", "User Data"),
      beta: path.join("Google", "Chrome Beta", "User Data"),
      dev: path.join("Google", "Chrome Dev", "User Data"),
      canary: path.join("Google", "Chrome SxS", "User Data")
    } satisfies Record<ChromateConfig["autoConnectChannel"], string>;
    return path.join(localAppData, productDir[channel]);
  }

  if (currentPlatform === "darwin") {
    const productDir = {
      stable: "Chrome",
      beta: "Chrome Beta",
      dev: "Chrome Dev",
      canary: "Chrome Canary"
    } satisfies Record<ChromateConfig["autoConnectChannel"], string>;
    return path.join(homedir(), "Library", "Application Support", "Google", productDir[channel]);
  }

  const configHome = process.env.CHROME_CONFIG_HOME ?? process.env.XDG_CONFIG_HOME ?? path.join(homedir(), ".config");
  const productDir = {
    stable: "google-chrome",
    beta: "google-chrome-beta",
    dev: "google-chrome-unstable",
    canary: "google-chrome-canary"
  } satisfies Record<ChromateConfig["autoConnectChannel"], string>;
  return path.join(configHome, productDir[channel]);
}

export async function readDevToolsActivePort(userDataDir: string): Promise<DevToolsActivePort> {
  const portPath = path.join(userDataDir, "DevToolsActivePort");
  let fileContent: string;

  try {
    fileContent = await readFile(portPath, "utf8");
  } catch (error) {
    throw new Error(
      `Could not read DevToolsActivePort at ${portPath}. Open chrome://inspect/#remote-debugging in Chrome 144+ and enable remote debugging.`,
      { cause: error }
    );
  }

  const [rawPort, rawPath] = fileContent
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (rawPort === undefined || rawPath === undefined) {
    throw new Error(`Invalid DevToolsActivePort content at ${portPath}`);
  }

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error(`Invalid DevToolsActivePort port '${rawPort}' at ${portPath}`);
  }

  return {
    userDataDir,
    webSocketDebuggerUrl: `ws://127.0.0.1:${port}${rawPath}`
  };
}

export async function probeCdpEndpoint(
  endpoint: string,
  timeoutMs: number,
  fetchImpl: FetchLike = fetch
): Promise<DiscoveredCdpEndpoint | undefined> {
  const version = await fetchCdpVersion(endpoint, timeoutMs, fetchImpl);
  if (version?.webSocketDebuggerUrl === undefined) {
    return undefined;
  }

  return {
    endpoint,
    webSocketDebuggerUrl: version.webSocketDebuggerUrl,
    browser: version.Browser
  };
}

export async function fetchCdpVersion(
  endpoint: string,
  timeoutMs: number,
  fetchImpl: FetchLike = fetch
): Promise<CdpVersion | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const versionUrl = new URL("/json/version", endpoint);
    const response = await fetchImpl(versionUrl, { signal: controller.signal });
    if (!response.ok) {
      return undefined;
    }

    return (await response.json()) as CdpVersion;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}
