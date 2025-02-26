-- CreateTable
CREATE TABLE "AssetDistribution" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "beneficiaries" JSONB,
    "organization" TEXT,
    "assetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssetDistribution_assetId_key" ON "AssetDistribution"("assetId");

-- AddForeignKey
ALTER TABLE "AssetDistribution" ADD CONSTRAINT "AssetDistribution_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
