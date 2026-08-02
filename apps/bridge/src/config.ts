import { DEFAULT_BRIDGE_PORT } from "@activityweaver/protocol";

export interface BridgeConfig {
  host: string;
  port: number;
  discordClientId?: string;
  logLevel: "debug" | "info" | "warn" | "error";
}

export function readConfig(environment: NodeJS.ProcessEnv = process.env): BridgeConfig {
  const port = Number(environment.ACTIVITYWEAVER_PORT ?? DEFAULT_BRIDGE_PORT);
  const logLevel = environment.ACTIVITYWEAVER_LOG_LEVEL;
  return {
    host: environment.ACTIVITYWEAVER_HOST || "127.0.0.1",
    port: Number.isInteger(port) && port > 0 && port < 65536 ? port : DEFAULT_BRIDGE_PORT,
    discordClientId: environment.ACTIVITYWEAVER_DISCORD_CLIENT_ID?.trim() || undefined,
    logLevel: logLevel === "debug" || logLevel === "warn" || logLevel === "error" ? logLevel : "info"
  };
}
