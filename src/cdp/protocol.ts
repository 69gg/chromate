export interface CdpCommandMessage {
  readonly id: number;
  readonly method: string;
  readonly params?: Record<string, unknown>;
  readonly sessionId?: string;
}

export interface CdpEventMessage {
  readonly method: string;
  readonly params?: Record<string, unknown>;
  readonly sessionId?: string;
}

export interface CdpResponseMessage {
  readonly id: number;
  readonly result?: unknown;
  readonly error?: {
    readonly code: number;
    readonly message: string;
    readonly data?: string;
  };
  readonly sessionId?: string;
}

export type CdpIncomingMessage = CdpEventMessage | CdpResponseMessage;

export interface TargetInfo {
  readonly targetId: string;
  readonly type: string;
  readonly title: string;
  readonly url: string;
  readonly attached: boolean;
  readonly canAccessOpener?: boolean;
}

export interface GetTargetsResult {
  readonly targetInfos: TargetInfo[];
}

export interface AttachToTargetResult {
  readonly sessionId: string;
}

export interface EvaluateResult<T> {
  readonly result: {
    readonly type: string;
    readonly value?: T;
    readonly unserializableValue?: string;
    readonly description?: string;
  };
  readonly exceptionDetails?: unknown;
}

export interface CaptureScreenshotResult {
  readonly data: string;
}
