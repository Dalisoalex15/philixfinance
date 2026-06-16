-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'LOAN_OFFICER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "branchId" TEXT,
    "avatarUrl" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "lastLoginAt" DATETIME,
    "lastLoginIp" TEXT,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "description" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ClientPortalAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "dateOfBirth" DATETIME,
    "gender" TEXT,
    "address" TEXT,
    "city" TEXT,
    "occupation" TEXT,
    "employer" TEXT,
    "monthlyIncome" REAL,
    "nrcNumber" TEXT,
    "kycStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "kycSubmittedAt" DATETIME,
    "kycVerifiedAt" DATETIME,
    "kycRejectedReason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_KYC',
    "linkedClientId" TEXT,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "lastLoginAt" DATETIME,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PortalRefreshToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortalRefreshToken_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ClientPortalAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PortalLoanApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "amountRequested" REAL NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL,
    "description" TEXT,
    "occupation" TEXT,
    "employer" TEXT,
    "employerPhone" TEXT,
    "monthlyIncome" REAL,
    "payDate" TEXT,
    "collateralType" TEXT,
    "collateralDesc" TEXT,
    "collateralValue" REAL,
    "ref1Name" TEXT,
    "ref1Phone" TEXT,
    "ref1Relation" TEXT,
    "ref2Name" TEXT,
    "ref2Phone" TEXT,
    "ref2Relation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "rejectedReason" TEXT,
    "linkedLoanId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PortalLoanApplication_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ClientPortalAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClientNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "sentViaEmail" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientNotification_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ClientPortalAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPortalAccount_clientNumber_key" ON "ClientPortalAccount"("clientNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPortalAccount_email_key" ON "ClientPortalAccount"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ClientPortalAccount_linkedClientId_key" ON "ClientPortalAccount"("linkedClientId");

-- CreateIndex
CREATE INDEX "ClientPortalAccount_email_idx" ON "ClientPortalAccount"("email");

-- CreateIndex
CREATE INDEX "ClientPortalAccount_clientNumber_idx" ON "ClientPortalAccount"("clientNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PortalRefreshToken_token_key" ON "PortalRefreshToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PortalLoanApplication_reference_key" ON "PortalLoanApplication"("reference");
