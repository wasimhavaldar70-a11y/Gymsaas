import { buildApp } from "./app.js";
import { config } from "./config.js";

const server = buildApp();

async function start() {
  try {
    await server.listen({
      port: config.PORT,
      host: config.API_HOST
    });
    server.log.info(`🚀 GYMCARE CRM API server running on http://${config.API_HOST}:${config.PORT}`);
    server.log.info(`👉 Health check: http://${config.API_HOST}:${config.PORT}/health`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown handling
const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
signals.forEach((signal) => {
  process.on(signal, async () => {
    server.log.info(`Received ${signal}, shutting down gracefully...`);
    await server.close();
    process.exit(0);
  });
});

start();
