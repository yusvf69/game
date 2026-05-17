import { createServer } from "http";
import app from "./main";
import { logger } from "./lib/logger";
import { initMonitoring, shutdownMonitoring } from "./lib/monitoring";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Initialize monitoring (PostHog)
initMonitoring().catch(() => {});

const httpServer = createServer(app);

httpServer.listen(port, () => {
  logger.info({ port }, "Server listening");
});

// Graceful shutdown
process.on("SIGTERM", () => {
  shutdownMonitoring();
  httpServer.close();
});
process.on("SIGINT", () => {
  shutdownMonitoring();
  httpServer.close();
});
