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
import portalInvestmentRoutes from "./routes/portal/investments";
import portalCalculateRoutes from "./routes/portal/calculate";
import accountsRoutes from "./routes/accounts";
import emailRoutes from "./routes/emails";
import financialsRoutes from "./routes/financials";
import aiRoutes from "./routes/ai";
import leaveRoutes from "./routes/leave";
import meetingsRoutes from "./routes/meetings";
import complianceRoutes from "./routes/compliance";
import procurementRoutes from "./routes/procurement";
import assetsRoutes from "./routes/assets";

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc:   ["'none'"],
      objectSrc:  ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));

app.use(compression());

// ── CORS — only the known frontend domain, never a wildcard ──────────────────
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  "https://philixfinance.vercel.app",
  "https://philix-finance.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:4173",
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // server-to-server / curl
    if (ALLOWED_ORIGINS.some(o => origin === o || origin.startsWith(o))) {
      return callback(null, true);
    }
    logger.warn(`CORS blocked: ${origin}`);
    const err = new Error("Not allowed by CORS") as Error & { status: number };
    err.status = 403;
    callback(err);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ── Rate limiters ─────────────────────────────────────────────────────────────

// Global: 300 req / 15 min per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

// Auth (login / register): 15 req / 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
});

// OTP (send / resend / forgot-password): 5 req / 10 min per IP
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many code requests. Please wait 10 minutes before requesting another." },
});

// Admin direct email send: 30 per hour per IP
const emailSendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Email sending limit reached. Please wait before sending more." },
});

// ── Body parsing — 20 MB to support base64 photo uploads ─────────────────────
app.use(globalLimiter);
app.use(cookieParser());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  }));
}

// ── Health check (unauthenticated) ────────────────────────────────────────────
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", timestamp: new Date().toISOString(), service: "Philix Finance API" });
  } catch {
    res.status(503).json({ status: "error", message: "Database unavailable" });
  }
});

app.options("*", cors());

// ── Routes ────────────────────────────────────────────────────────────────────
// All staff/admin routes enforce authenticate() inside their own router
app.use("/api/auth",          authLimiter, authRoutes);
app.use("/api/users",         userRoutes);
app.use("/api/clients",       clientRoutes);
app.use("/api/loans",         loanRoutes);
app.use("/api/collateral",    collateralRoutes);
app.use("/api/payments",      paymentRoutes);
app.use("/api/collections",   collectionRoutes);
app.use("/api/reports",       reportRoutes);
app.use("/api/expenses",      expenseRoutes);
app.use("/api/investors",     investorRoutes);
app.use("/api/tasks",         taskRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/dashboard",     dashboardRoutes);
app.use("/api/documents",     documentRoutes);
app.use("/api/wiki",          wikiRoutes);
app.use("/api/audit",         auditRoutes);
app.use("/api/branches",      branchRoutes);
app.use("/api/recovery",      recoveryRoutes);
app.use("/api/admin",         adminRoutes);
app.use("/api/capital",       capitalRoutes);
app.use("/api/accounting",    accountingRoutes);
app.use("/api/ai",            aiRoutes);
app.use("/api/leave",         leaveRoutes);
app.use("/api/meetings",      meetingsRoutes);
app.use("/api/compliance",    complianceRoutes);
app.use("/api/procurement",   procurementRoutes);
app.use("/api/assets",        assetsRoutes);

// Portal — public auth (register/login) under authLimiter;
// OTP routes also get the stricter otpLimiter mounted before the auth router
app.use("/api/portal/auth/send-email-code",    otpLimiter);
app.use("/api/portal/auth/confirm-email-code", otpLimiter);
app.use("/api/portal/auth/verify-otp",         otpLimiter);
app.use("/api/portal/auth/resend-otp",         otpLimiter);
app.use("/api/portal/auth/forgot-password",    otpLimiter);
app.use("/api/portal/auth",                authLimiter, portalAuthRoutes);

// Portal — authenticated client routes (authenticatePortal enforced inside each router)
app.use("/api/portal/me",            portalMeRoutes);
app.use("/api/portal/applications",  portalApplicationRoutes);
app.use("/api/portal/kyc",           portalKycRoutes);
app.use("/api/portal/notifications", portalNotificationRoutes);
app.use("/api/portal/investments",  portalInvestmentRoutes);
app.use("/api/portal/calculate",    portalCalculateRoutes);
app.use("/api/accounts",            accountsRoutes);
app.use("/api/emails",             emailRoutes);
app.use("/api/financials",         financialsRoutes);
app.use("/api/webhooks",           emailRoutes); // Resend webhook on /api/webhooks/resend

// Tighter limit on staff email sends
app.use("/api/admin/send-client-email", emailSendLimiter);

// ── 404 & error handler ───────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use(errorHandler);

export default app;
