import { ActivityRouter } from "./activity-router.js";
import { readConfig } from "./config.js";
import { DiscordIpcClient } from "./discord-ipc.js";
import { createLogger } from "./logger.js";
import { BridgeServer } from "./server.js";

const config = readConfig();
const logger = createLogger(config.logLevel);
const discord = config.discordClientId
  ? new DiscordIpcClient(config.discordClientId, logger)
  : undefined;

if (!discord) {
  logger.warn("No Discord application ID configured; the bridge will validate traffic but keep presence disabled");
}

const router = new ActivityRouter(
  async (activity) => {
    if (!discord) return;
    const connected = activity ? await discord.setActivity(activity) : await discord.clearActivity();
    if (!connected) logger.debug("Discord update will retry after the next browser update");
  },
  logger
);

const server = new BridgeServer({
  config,
  router,
  discordStatus: () => (discord ? (discord.isConnected() ? "connected" : "disconnected") : "disabled"),
  logger
});

server.start();

const shutdown = async (signal: string): Promise<void> => {
  logger.info("Stopping bridge", { signal });
  discord?.close();
  await server.stop();
  process.exit(0);
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
