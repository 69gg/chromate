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
