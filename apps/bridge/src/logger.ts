export type LogLevel = "debug" | "info" | "warn" | "error";

const weight: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

export interface Logger {
  debug(message: string, details?: unknown): void;
  info(message: string, details?: unknown): void;
  warn(message: string, details?: unknown): void;
  error(message: string, details?: unknown): void;
}

export function createLogger(minimum: LogLevel): Logger {
  function write(level: LogLevel, message: string, details?: unknown): void {
    if (weight[level] < weight[minimum]) return;
    const suffix = details === undefined ? "" : " " + stringify(details);
    const line = "[" + new Date().toISOString() + "] [" + level + "] " + message + suffix;
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  }

  return {
    debug: (message, details) => write("debug", message, details),
    info: (message, details) => write("info", message, details),
    warn: (message, details) => write("warn", message, details),
    error: (message, details) => write("error", message, details)
  };
}

function stringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}
