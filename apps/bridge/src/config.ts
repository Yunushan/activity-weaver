import { DEFAULT_BRIDGE_PORT } from "@activityweaver/protocol";

export const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const DEFAULT_REMOTE_PORT = DEFAULT_BRIDGE_PORT + 1;
const MIN_REMOTE_TOKEN_LENGTH = 32;

export interface RemoteBridgeConfig {
  host: string;
  port: number;
  token: string;
  tlsCertPath: string;
  tlsKeyPath: string;
}

export interface BridgeConfig {
  host: string;
  port: number;
  discordClientId?: string;
  logLevel: "debug" | "info" | "warn" | "error";
  remote?: RemoteBridgeConfig;
}

export function readConfig(environment: NodeJS.ProcessEnv = process.env): BridgeConfig {
  const port = Number(environment.ACTIVITYWEAVER_PORT ?? DEFAULT_BRIDGE_PORT);
  const logLevel = environment.ACTIVITYWEAVER_LOG_LEVEL;
  const requestedHost = environment.ACTIVITYWEAVER_HOST?.trim().toLowerCase();
  const remoteHost = environment.ACTIVITYWEAVER_REMOTE_HOST?.trim().toLowerCase();
  const remotePort = Number(environment.ACTIVITYWEAVER_REMOTE_PORT ?? DEFAULT_REMOTE_PORT);
  const remoteToken = environment.ACTIVITYWEAVER_REMOTE_TOKEN?.trim();
  const remoteTlsCertPath = environment.ACTIVITYWEAVER_REMOTE_TLS_CERT?.trim();
  const remoteTlsKeyPath = environment.ACTIVITYWEAVER_REMOTE_TLS_KEY?.trim();
  const remoteConfigured = [remoteHost, remoteToken, remoteTlsCertPath, remoteTlsKeyPath, environment.ACTIVITYWEAVER_REMOTE_PORT]
    .some((value) => value !== undefined && value !== "");
  if (remoteConfigured && (!remoteHost
    || !Number.isInteger(remotePort)
    || remotePort < 1
    || remotePort > 65535
    || !remoteToken
    || remoteToken.length < MIN_REMOTE_TOKEN_LENGTH
    || !remoteTlsCertPath
    || !remoteTlsKeyPath)) {
    throw new Error("Remote bridge requires host, port, a 32+ character token, TLS certificate, and TLS key.");
  }
  return {
    host: requestedHost && isLoopbackHost(requestedHost) ? requestedHost : "127.0.0.1",
    port: Number.isInteger(port) && port > 0 && port < 65536 ? port : DEFAULT_BRIDGE_PORT,
    discordClientId: environment.ACTIVITYWEAVER_DISCORD_CLIENT_ID?.trim() || undefined,
    logLevel: logLevel === "debug" || logLevel === "warn" || logLevel === "error" ? logLevel : "info",
    remote: remoteConfigured
      ? {
          host: remoteHost!,
          port: remotePort,
          token: remoteToken!,
          tlsCertPath: remoteTlsCertPath!,
          tlsKeyPath: remoteTlsKeyPath!
        }
      : undefined
  };
}

export function isLoopbackHost(host: string): boolean {
  return LOOPBACK_HOSTS.has(host.trim().toLowerCase());
}
