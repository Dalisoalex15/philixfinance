import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { prisma } from "./lib/prisma";
import { logger } from "./lib/logger";
import { errorHandler } from "./middleware/errorHandler";

// Routes
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import clientRoutes from "./routes/clients";
import loanRoutes from "./routes/loans";
import collateralRoutes from "./routes/collateral";
import paymentRoutes from "./routes/payments";
import collectionRoutes from "./routes/collections";
import reportRoutes from "./routes/reports";
import expenseRoutes from "./routes/expenses";
import investorRoutes from "./routes/investors";
import taskRoutes from "./routes/tasks";
import notificationRoutes from "./routes/notifications";
import announcementRoutes from "./routes/announcements";
import dashboardRoutes from "./routes/dashboard";
import documentRoutes from "./routes/documents";
import wikiRoutes from "./routes/wiki";
import auditRoutes from "./routes/audit";
import branchRoutes from "./routes/branches";
import recoveryRoutes from "./routes/recovery";
// Client Portal routes
import portalAuthRoutes from "./routes/portal/auth";
import portalMeRoutes from "./routes/portal/me";
import portalApplicationRoutes from "./routes/portal/applications";
import portalKycRoutes from "./routes/portal/kyc";
import portalNotificationRoutes from "./routes/portal/notifications";

const app = express();
const PORT = process.env.PORT || 4000;

// Security
app.use(helmet());
app.use(compression());

// CORS
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile apps, server-to-server)
    if (!origin) return callback(null, true);
    // Allow any localhost port or local network IP
    if (allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+):\d+$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: "Too many requests. Please try again later." },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Too many login attempts. Please try again later." },
});

app.use(limiter);
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Logging
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  }));
}

// Health check
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", timestamp: new Date().toISOString(), service: "Philix Finance API" });
  } catch {
    res.status(503).json({ status: "error", message: "Database unavailable" });
  }
});

// Explicit CORS preflight handler — must be before all routes
app.options("*", cors());

// API Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/collateral", collateralRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/investors", investorRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/wiki", wikiRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/recovery", recoveryRoutes);
// Client Portal
app.use("/api/portal/auth", authLimiter, portalAuthRoutes);
app.use("/api/portal/me", portalMeRoutes);
app.use("/api/portal/applications", portalApplicationRoutes);
app.use("/api/portal/kyc", portalKycRoutes);
app.use("/api/portal/notifications", portalNotificationRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use(errorHandler);

// Start
async function main() {
  try {
    await prisma.$connect();
    logger.info("Database connected successfully");

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

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await prisma.$disconnect();
  process.exit(0);
});
