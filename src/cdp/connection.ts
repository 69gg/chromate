import WebSocket from "ws";
import type { ChromateConfig } from "../config.js";
import { withTimeout } from "../utils/time.js";
import { discoverLocalCdpEndpoint, probeCdpEndpoint } from "./discovery.js";
import type {
  CdpCommandMessage,
  CdpIncomingMessage,
  CdpResponseMessage
} from "./protocol.js";

export interface CdpTransport {
  connect(): Promise<void>;
  close(): Promise<void>;
  send<T>(method: string, params?: Record<string, unknown>, sessionId?: string): Promise<T>;
}

interface PendingCommand {
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
  readonly method: string;
}

export class CdpConnection implements CdpTransport {
  private socket: WebSocket | undefined;
  private nextId = 1;
  private readonly pending = new Map<number, PendingCommand>();

  public constructor(private readonly config: ChromateConfig) {}

  public async connect(): Promise<void> {
    if (this.socket !== undefined && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    const browserWebSocketUrl = await this.resolveBrowserWebSocketUrl();
    const socket = new WebSocket(browserWebSocketUrl);

    await withTimeout(
      new Promise<void>((resolve, reject) => {
        socket.once("open", resolve);
        socket.once("error", reject);
      }),
      this.config.connectTimeoutMs,
      "CDP websocket connection"
    );

    socket.on("message", (data) => this.handleMessage(data.toString()));
    socket.on("close", () => this.rejectAll(new Error("CDP websocket closed")));
    socket.on("error", (error) => this.rejectAll(error));
    this.socket = socket;
  }

  public async close(): Promise<void> {
    if (this.socket === undefined) {
      return;
    }

    const socket = this.socket;
    this.socket = undefined;

    await new Promise<void>((resolve) => {
      if (socket.readyState === WebSocket.CLOSED) {
        resolve();
        return;
      }

      socket.once("close", () => resolve());
      socket.close();
    });
  }

  public async send<T>(
    method: string,
    params?: Record<string, unknown>,
    sessionId?: string
  ): Promise<T> {
    await this.connect();

    const socket = this.socket;
    if (socket === undefined || socket.readyState !== WebSocket.OPEN) {
      throw new Error("CDP websocket is not open");
    }

    const id = this.nextId;
    this.nextId += 1;

    const message: CdpCommandMessage = { id, method, params, sessionId };
    const responsePromise = new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        method,
        resolve: (value: unknown) => resolve(value as T),
        reject
      });
    });

    socket.send(JSON.stringify(message));
    return await withTimeout(responsePromise, this.config.actionTimeoutMs, method);
  }

  private async resolveBrowserWebSocketUrl(): Promise<string> {
    const configuredEndpoint = this.config.cdpEndpoint;
    if (configuredEndpoint === undefined) {
      return (await discoverLocalCdpEndpoint(this.config)).webSocketDebuggerUrl;
    }

    if (configuredEndpoint.startsWith("ws://") || configuredEndpoint.startsWith("wss://")) {
      return configuredEndpoint;
    }

    const discovered = await probeCdpEndpoint(configuredEndpoint, this.config.connectTimeoutMs);
    if (discovered === undefined) {
      throw new Error(`CDP endpoint is not available or did not return webSocketDebuggerUrl: ${configuredEndpoint}`);
    }

    return discovered.webSocketDebuggerUrl;
  }

  private handleMessage(raw: string): void {
    const message = JSON.parse(raw) as CdpIncomingMessage;
    if (!("id" in message)) {
      return;
    }

    const response = message as CdpResponseMessage;
    const pending = this.pending.get(response.id);
    if (pending === undefined) {
      return;
    }

    this.pending.delete(response.id);

    if (response.error !== undefined) {
      pending.reject(new Error(`${pending.method} failed: ${response.error.message}`));
      return;
    }

    pending.resolve(response.result ?? {});
  }

  private rejectAll(error: Error): void {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }

    this.pending.clear();
  }
}
