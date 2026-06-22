import type { ChromateConfig } from "../config.js";

type LogLevel = ChromateConfig["logLevel"];

const priorities: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  info: 2,
  debug: 3
};

export class Logger {
  public constructor(private readonly level: LogLevel) {}

  public error(message: string, error?: unknown): void {
    if (this.enabled("error")) {
      console.error(`[chromate] ${message}`, error ?? "");
    }
  }

  public info(message: string): void {
    if (this.enabled("info")) {
      console.error(`[chromate] ${message}`);
    }
  }

  public debug(message: string): void {
    if (this.enabled("debug")) {
      console.error(`[chromate] ${message}`);
    }
  }

  private enabled(level: Exclude<LogLevel, "silent">): boolean {
    return priorities[this.level] >= priorities[level];
  }
}
