import "dotenv/config";
import { validateEnv } from "./lib/validateEnv";
validateEnv(); // Must run before anything else reads process.env
import { prisma } from "./lib/prisma";
import { logger } from "./lib/logger";
import app from "./app";
import { startCronJobs } from "./jobs/paymentReminders";

const PORT = process.env.PORT || 4000;

async function main() {
  try {
    await prisma.$connect();
    logger.info("Database connected successfully");

    startCronJobs();

    app.listen(PORT, () => {
      logger.info(`Philix Finance API running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await prisma.$disconnect();
  process.exit(0);
});
