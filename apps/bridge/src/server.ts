import { readFileSync } from "node:fs";
import { createServer as createHttpsServer, type Server as HttpsServer } from "node:https";
import { timingSafeEqual } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
import {
  PROTOCOL_VERSION,
  parseBridgeRequest,
  type BridgeResponse,
  type PresenceActivity
} from "@activityweaver/protocol";
import type { BridgeConfig } from "./config.js";
import type { ActivityRouter } from "./activity-router.js";
import type { Logger } from "./logger.js";

const RATE_WINDOW_MS = 10_000;
const MAX_MESSAGES_PER_WINDOW = 120;

export interface BridgeServerOptions {
  config: BridgeConfig;
  router: ActivityRouter;
  discordStatus: () => "connected" | "disconnected" | "disabled";
  logger: Logger;
}

export class BridgeServer {
  private localServer: WebSocketServer | undefined;
  private remoteServer: WebSocketServer | undefined;
  private remoteTlsServer: HttpsServer | undefined;

  public constructor(private readonly options: BridgeServerOptions) {
  }

  public start(): void {
    if (this.localServer) return;
    const remote = this.options.config.remote;
    const remoteTlsCredentials = remote
      ? {
          cert: readFileSync(remote.tlsCertPath),
          key: readFileSync(remote.tlsKeyPath)
        }
      : undefined;
    const localServer = this.localServer = new WebSocketServer({
      host: this.options.config.host,
      port: this.options.config.port,
      maxPayload: 128 * 1024,
      clientTracking: true
    });
    localServer.on("listening", () => {
      this.options.logger.info("ActivityWeaver bridge listening", {
        address: this.options.config.host + ":" + this.options.config.port
      });
    });
    this.attachServer(localServer, false);

    if (!remote || !remoteTlsCredentials) return;
    const tlsServer = createHttpsServer(remoteTlsCredentials);
    const remoteServer = this.remoteServer = new WebSocketServer({
      server: tlsServer,
      maxPayload: 128 * 1024,
      clientTracking: true
    });
    this.remoteTlsServer = tlsServer;
    tlsServer.on("listening", () => {
      this.options.logger.info("ActivityWeaver authenticated remote bridge listening", {
        address: remote.host + ":" + remote.port
      });
    });
    tlsServer.on("error", (error) => this.options.logger.error("Remote bridge TLS server error", error.message));
    this.attachServer(remoteServer, true);
    tlsServer.listen(remote.port, remote.host);
  }

  public async stop(): Promise<void> {
    const localServer = this.localServer;
    const remoteServer = this.remoteServer;
    const remoteTlsServer = this.remoteTlsServer;
    this.localServer = undefined;
    this.remoteServer = undefined;
    this.remoteTlsServer = undefined;
    await this.closeWebSocketServer(localServer);
    await this.closeWebSocketServer(remoteServer);
    await this.closeTlsServer(remoteTlsServer);
  }

  private attachServer(server: WebSocketServer, remote: boolean): void {
    server.on("error", (error) => this.options.logger.error("Bridge WebSocket server error", error.message));
    server.on("connection", (socket, request) => {
      const origin = request.headers.origin;
      const remoteAddress = request.socket.remoteAddress;
      const allowedOrigin = !origin || /^(chrome-extension|moz-extension|safari-web-extension):\/\//.test(origin);
      if ((!remote && !isLoopbackAddress(remoteAddress)) || !allowedOrigin) {
        this.options.logger.warn("Rejected bridge connection", { origin, remoteAddress, remote });
        socket.close(1008, remote ? "Browser origin not allowed" : "Loopback bridge only");
        return;
      }
      this.options.logger.debug(remote ? "Authenticated remote client connecting" : "Extension connected", {
        address: remoteAddress
      });
      this.handleConnection(socket, remote);
    });
  }

  private handleConnection(socket: WebSocket, remote: boolean): void {
    const sources = new Set<string>();
    const expectedToken = this.options.config.remote?.token;
    let authenticated = !remote;
    const authTimer = remote
      ? setTimeout(() => {
          if (!authenticated) socket.close(1008, "Authentication required");
        }, 5000)
      : undefined;
    authTimer?.unref();
    let windowStartedAt = Date.now();
    let messageCount = 0;
    socket.on("message", (data, isBinary) => {
      const now = Date.now();
      if (now - windowStartedAt >= RATE_WINDOW_MS) {
        windowStartedAt = now;
        messageCount = 0;
      }
      messageCount += 1;
      if (messageCount > MAX_MESSAGES_PER_WINDOW) {
        this.send(socket, { type: "error", code: "rate_limited", message: "Too many messages." });
        socket.close(1008, "Rate limit exceeded");
        return;
      }
      if (isBinary) {
        this.send(socket, { type: "error", code: "invalid_json", message: "Messages must be UTF-8 JSON text." });
        return;
      }
      let value: unknown;
      try {
        value = JSON.parse(data.toString("utf8"));
      } catch {
        this.send(socket, { type: "error", code: "invalid_json", message: "Message must be valid JSON." });
        return;
      }

      const request = parseBridgeRequest(value);
      if (!request) {
        this.send(socket, { type: "error", code: "invalid_request", message: "Message does not match the protocol." });
        return;
      }

      if (!authenticated) {
        if (request.type !== "hello"
          || !expectedToken
          || !request.authToken
          || !tokensEqual(expectedToken, request.authToken)) {
          this.send(socket, { type: "error", code: "authentication_required", message: "Remote bridge authentication failed." });
          socket.close(1008, "Authentication failed");
          return;
        }
        authenticated = true;
        if (authTimer) clearTimeout(authTimer);
        this.sendHello(socket);
        return;
      }

      if (request.type === "hello") {
        this.sendHello(socket);
        return;
      }

      if (request.type === "set_activity") {
        sources.add(request.envelope.source.id);
        this.options.router.upsert(request.envelope);
        this.send(socket, {
          type: "ack",
          request: "set_activity",
          sourceId: request.envelope.source.id
        });
        return;
      }

      sources.delete(request.sourceId);
      this.options.router.clear(request.sourceId);
      this.send(socket, { type: "ack", request: "clear_activity", sourceId: request.sourceId });
    });
    socket.on("close", () => {
      if (authTimer) clearTimeout(authTimer);
      for (const sourceId of sources) this.options.router.clear(sourceId);
    });
    socket.on("error", (error) => this.options.logger.debug("Extension socket error", error.message));
  }

  private send(socket: WebSocket, response: BridgeResponse): void {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(response));
  }

  private sendHello(socket: WebSocket): void {
    this.send(socket, {
      type: "hello",
      protocol: PROTOCOL_VERSION,
      bridge: "activityweaver",
      discord: this.options.discordStatus()
    });
  }

  private closeWebSocketServer(server: WebSocketServer | undefined): Promise<void> {
    if (!server) return Promise.resolve();
    return new Promise((resolve) => {
      try {
        server.close(() => resolve());
      } catch {
        resolve();
      }
    });
  }

  private closeTlsServer(server: HttpsServer | undefined): Promise<void> {
    if (!server || !server.listening) return Promise.resolve();
    return new Promise((resolve) => server.close(() => resolve()));
  }
}

function tokensEqual(expected: string, actual: string): boolean {
  const expectedBytes = Buffer.from(expected, "utf8");
  const actualBytes = Buffer.from(actual, "utf8");
  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes);
}

function isLoopbackAddress(address: string | undefined): boolean {
  if (!address) return false;
  const normalized = address.toLowerCase();
  return normalized === "::1"
    || normalized === "127.0.0.1"
    || normalized === "::ffff:127.0.0.1";
}

export function activityForLog(activity: PresenceActivity | undefined): Record<string, unknown> {
  return activity ? { details: activity.details, state: activity.state } : { cleared: true };
}
