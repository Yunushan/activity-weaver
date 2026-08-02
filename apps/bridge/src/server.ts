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

export interface BridgeServerOptions {
  config: BridgeConfig;
  router: ActivityRouter;
  discordStatus: () => "connected" | "disconnected" | "disabled";
  logger: Logger;
}

export class BridgeServer {
  private readonly server: WebSocketServer;

  public constructor(private readonly options: BridgeServerOptions) {
    this.server = new WebSocketServer({
      host: options.config.host,
      port: options.config.port,
      maxPayload: 128 * 1024
    });
  }

  public start(): void {
    this.server.on("listening", () => {
      this.options.logger.info("ActivityWeaver bridge listening", {
        address: this.options.config.host + ":" + this.options.config.port
      });
    });
    this.server.on("error", (error) => this.options.logger.error("Bridge WebSocket server error", error.message));
    this.server.on("connection", (socket, request) => {
      this.options.logger.debug("Extension connected", { address: request.socket.remoteAddress });
      this.handleConnection(socket);
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  private handleConnection(socket: WebSocket): void {
    const sources = new Set<string>();
    socket.on("message", (data) => {
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

      if (request.type === "hello") {
        this.send(socket, {
          type: "hello",
          protocol: PROTOCOL_VERSION,
          bridge: "activityweaver",
          discord: this.options.discordStatus()
        });
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
      for (const sourceId of sources) this.options.router.clear(sourceId);
    });
    socket.on("error", (error) => this.options.logger.debug("Extension socket error", error.message));
  }

  private send(socket: WebSocket, response: BridgeResponse): void {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(response));
  }
}

export function activityForLog(activity: PresenceActivity | undefined): Record<string, unknown> {
  return activity ? { details: activity.details, state: activity.state } : { cleared: true };
}
