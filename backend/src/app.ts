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
import adminRoutes from "./routes/admin";
import capitalRoutes from "./routes/capital";
import accountingRoutes from "./routes/accounting";
import portalAuthRoutes from "./routes/portal/auth";
import portalMeRoutes from "./routes/portal/me";
import portalApplicationRoutes from "./routes/portal/applications";
import portalKycRoutes from "./routes/portal/kyc";
import portalNotificationRoutes from "./routes/portal/notifications";
import aiRoutes from "./routes/ai";

const app = express();

app.use(helmet());
app.use(compression());

app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

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

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  }));
}

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", timestamp: new Date().toISOString(), service: "Philix Finance API" });
  } catch {
    res.status(503).json({ status: "error", message: "Database unavailable" });
  }
});

app.options("*", cors());

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
app.use("/api/admin", adminRoutes);
app.use("/api/capital", capitalRoutes);
app.use("/api/accounting", accountingRoutes);
app.use("/api/portal/auth", authLimiter, portalAuthRoutes);
app.use("/api/portal/me", portalMeRoutes);
app.use("/api/portal/applications", portalApplicationRoutes);
app.use("/api/portal/kyc", portalKycRoutes);
app.use("/api/portal/notifications", portalNotificationRoutes);
app.use("/api/ai", aiRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use(errorHandler);

export default app;
