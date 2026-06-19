-- CreateTable
CREATE TABLE "CapitalEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "source" TEXT NOT NULL,
    "provider" TEXT,
    "reference" TEXT,
    "description" TEXT,
    "addedBy" TEXT NOT NULL,
    "entryDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LoanPaymentSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" REAL,
    "paymentMethod" TEXT,
    "provider" TEXT,
    "reference" TEXT,
    "screenshotData" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "rejectedReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LoanPaymentSubmission_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "PortalLoanApplication" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PortalLoanApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "amountRequested" REAL NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "interestRate" REAL NOT NULL DEFAULT 0,
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
    "collateralPhotos" TEXT,
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
INSERT INTO "new_PortalLoanApplication" ("accountId", "amountRequested", "collateralDesc", "collateralPhotos", "collateralType", "collateralValue", "createdAt", "description", "employer", "employerPhone", "id", "linkedLoanId", "monthlyIncome", "occupation", "payDate", "productType", "purpose", "ref1Name", "ref1Phone", "ref1Relation", "ref2Name", "ref2Phone", "ref2Relation", "reference", "rejectedReason", "reviewedAt", "reviewedBy", "status", "termMonths", "updatedAt") SELECT "accountId", "amountRequested", "collateralDesc", "collateralPhotos", "collateralType", "collateralValue", "createdAt", "description", "employer", "employerPhone", "id", "linkedLoanId", "monthlyIncome", "occupation", "payDate", "productType", "purpose", "ref1Name", "ref1Phone", "ref1Relation", "ref2Name", "ref2Phone", "ref2Relation", "reference", "rejectedReason", "reviewedAt", "reviewedBy", "status", "termMonths", "updatedAt" FROM "PortalLoanApplication";
DROP TABLE "PortalLoanApplication";
ALTER TABLE "new_PortalLoanApplication" RENAME TO "PortalLoanApplication";
CREATE UNIQUE INDEX "PortalLoanApplication_reference_key" ON "PortalLoanApplication"("reference");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
