import { z } from "zod";

export interface ChromateConfig {
  readonly cdpEndpoint?: string;
  readonly autoConnect: boolean;
  readonly autoConnectChannel: "stable" | "beta" | "dev" | "canary";
  readonly autoConnectUserDataDir?: string;
  readonly cdpDiscoveryPorts: readonly number[];
  readonly discoveryTimeoutMs: number;
  readonly connectTimeoutMs: number;
  readonly actionTimeoutMs: number;
  readonly settleDelayMs: number;
  readonly gridStep: number;
  readonly logLevel: "silent" | "error" | "info" | "debug";
}

const defaultDiscoveryPorts = [9222, 9223, 9224, 9333] as const;

const configSchema = z.object({
  cdpEndpoint: z.string().url().optional(),
  autoConnect: z.boolean(),
  autoConnectChannel: z.enum(["stable", "beta", "dev", "canary"]),
  autoConnectUserDataDir: z.string().min(1).optional(),
  cdpDiscoveryPorts: z.array(z.number().int().min(1).max(65_535)).min(1),
  discoveryTimeoutMs: z.number().int().positive(),
  connectTimeoutMs: z.number().int().positive(),
  actionTimeoutMs: z.number().int().positive(),
  settleDelayMs: z.number().int().nonnegative(),
  gridStep: z.number().int().min(20).max(400),
  logLevel: z.enum(["silent", "error", "info", "debug"])
});

function readNumber(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function readPorts(value: string | undefined, fallback: readonly number[]): number[] {
  if (value === undefined || value.trim() === "") {
    return [...fallback];
  }

  return value.split(",").map((port) => Number(port.trim()));
}

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ChromateConfig {
  return configSchema.parse({
    cdpEndpoint: env.CHROMATE_CDP_ENDPOINT,
    autoConnect: readBoolean(env.CHROMATE_AUTO_CONNECT, false),
    autoConnectChannel: env.CHROMATE_AUTO_CONNECT_CHANNEL ?? "stable",
    autoConnectUserDataDir: env.CHROMATE_AUTO_CONNECT_USER_DATA_DIR,
    cdpDiscoveryPorts: readPorts(env.CHROMATE_CDP_DISCOVERY_PORTS, defaultDiscoveryPorts),
    discoveryTimeoutMs: readNumber(env.CHROMATE_DISCOVERY_TIMEOUT_MS, 350),
    connectTimeoutMs: readNumber(env.CHROMATE_CONNECT_TIMEOUT_MS, 10_000),
    actionTimeoutMs: readNumber(env.CHROMATE_ACTION_TIMEOUT_MS, 30_000),
    settleDelayMs: readNumber(env.CHROMATE_SETTLE_DELAY_MS, 500),
    gridStep: readNumber(env.CHROMATE_GRID_STEP, 100),
    logLevel: env.CHROMATE_LOG_LEVEL ?? "info"
  });
}
