-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "gptBot" BOOLEAN NOT NULL DEFAULT true,
    "anthropicAI" BOOLEAN NOT NULL DEFAULT true,
    "googleExtended" BOOLEAN NOT NULL DEFAULT true,
    "perplexityBot" BOOLEAN NOT NULL DEFAULT true,
    "deepSeekBot" BOOLEAN NOT NULL DEFAULT true,
    "includeProducts" BOOLEAN NOT NULL DEFAULT true,
    "includeCollections" BOOLEAN NOT NULL DEFAULT true,
    "includePages" BOOLEAN NOT NULL DEFAULT true,
    "includeArticles" BOOLEAN NOT NULL DEFAULT true,
    "autoSyncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "planName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "price" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "interval" TEXT NOT NULL DEFAULT 'EVERY_30_DAYS',
    "currentPeriodStart" DATETIME,
    "currentPeriodEnd" DATETIME,
    "trialStart" DATETIME,
    "trialEnd" DATETIME,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Settings_shop_key" ON "Settings"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_shop_key" ON "Subscription"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_subscriptionId_key" ON "Subscription"("subscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_shop_status_idx" ON "Subscription"("shop", "status");
