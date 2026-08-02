import net from "node:net";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import type { PresenceActivity } from "@activityweaver/protocol";
import type { Logger } from "./logger.js";

const HANDSHAKE_OPCODE = 0;
const FRAME_MAX_BYTES = 1024 * 1024;

export class DiscordIpcClient {
  private socket: net.Socket | undefined;
  private ready = false;
  private connecting: Promise<boolean> | undefined;
  private receiveBuffer = Buffer.alloc(0);

  public constructor(
    private readonly clientId: string,
    private readonly logger: Logger
  ) {}

  public async setActivity(activity: PresenceActivity): Promise<boolean> {
    if (!(await this.ensureConnected())) return false;
    return this.sendCommand("SET_ACTIVITY", {
      pid: process.pid,
      activity
    });
  }

  public async clearActivity(): Promise<boolean> {
    if (!(await this.ensureConnected())) return false;
    return this.sendCommand("SET_ACTIVITY", {
      pid: process.pid,
      activity: null
    });
  }

  public close(): void {
    this.ready = false;
    this.socket?.destroy();
    this.socket = undefined;
  }

  public isConnected(): boolean {
    return this.ready && this.socket !== undefined && !this.socket.destroyed;
  }

  private async ensureConnected(): Promise<boolean> {
    if (this.isConnected()) return true;
    if (this.connecting) return this.connecting;
    this.connecting = this.connectToAnyPipe().finally(() => {
      this.connecting = undefined;
    });
    return this.connecting;
  }

  private async connectToAnyPipe(): Promise<boolean> {
    for (const pipe of candidatePipes()) {
      const connected = await this.connectToPipe(pipe);
      if (connected) {
        this.logger.info("Connected to Discord IPC", { pipe });
        return true;
      }
    }
    this.logger.warn("Discord IPC is unavailable; presence will retry on the next update");
    return false;
  }

  private connectToPipe(pipe: string): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = net.createConnection(pipe);
      let settled = false;
      const finish = (result: boolean): void => {
        if (settled) return;
        settled = true;
        resolve(result);
      };

      socket.once("error", () => {
        socket.destroy();
        finish(false);
      });
      socket.once("connect", () => {
        this.socket = socket;
        this.ready = true;
        this.receiveBuffer = Buffer.alloc(0);
        socket.on("data", (chunk) => this.handleData(chunk));
        socket.on("close", () => {
          this.ready = false;
          this.socket = undefined;
          this.logger.debug("Discord IPC connection closed");
        });
        this.sendFrame(HANDSHAKE_OPCODE, {
          v: 1,
          client_id: this.clientId
        });
        finish(true);
      });
    });
  }

  private handleData(chunk: Buffer): void {
    this.receiveBuffer = Buffer.concat([this.receiveBuffer, chunk]);
    while (this.receiveBuffer.length >= 8) {
      const opcode = this.receiveBuffer.readInt32LE(0);
      const length = this.receiveBuffer.readInt32LE(4);
      if (length < 0 || length > FRAME_MAX_BYTES) {
        this.logger.error("Discord IPC returned an invalid frame length");
        this.close();
        return;
      }
      if (this.receiveBuffer.length < 8 + length) return;
      const body = this.receiveBuffer.subarray(8, 8 + length).toString("utf8");
      this.receiveBuffer = this.receiveBuffer.subarray(8 + length);
      try {
        const message = JSON.parse(body) as { evt?: string; code?: number; data?: unknown };
        this.logger.debug("Discord IPC event", { opcode, event: message.evt, code: message.code });
        if (message.evt === "ERROR") {
          this.logger.warn("Discord rejected a Rich Presence update", message.data);
        }
      } catch {
        this.logger.warn("Discord IPC returned non-JSON data");
      }
    }
  }

  private sendCommand(command: string, args: Record<string, unknown>): boolean {
    return this.sendFrame(1, {
      cmd: command,
      args,
      nonce: crypto.randomUUID()
    });
  }

  private sendFrame(opcode: number, payload: Record<string, unknown>): boolean {
    if (!this.socket || this.socket.destroyed) return false;
    const body = Buffer.from(JSON.stringify(payload), "utf8");
    const header = Buffer.alloc(8);
    header.writeInt32LE(opcode, 0);
    header.writeInt32LE(body.length, 4);
    this.socket.write(Buffer.concat([header, body]));
    return true;
  }
}

function candidatePipes(): string[] {
  const values: string[] = [];
  for (let index = 0; index < 10; index += 1) {
    if (process.platform === "win32") {
      values.push("\\\\.\\pipe\\discord-ipc-" + index);
      values.push("\\\\?\\pipe\\discord-ipc-" + index);
      continue;
    }
    const runtime = process.env.XDG_RUNTIME_DIR;
    if (runtime) values.push(path.join(runtime, "discord-ipc-" + index));
    values.push("/tmp/discord-ipc-" + index);
    values.push(path.join(os.homedir(), ".config", "discord", "discord-ipc-" + index));
    values.push(path.join(os.homedir(), ".config", "discordcanary", "discord-ipc-" + index));
    values.push(path.join(os.homedir(), "Library", "Application Support", "discord", "discord-ipc-" + index));
  }
  return [...new Set(values)];
}
