-- CreateTable
CREATE TABLE "Agreement" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "signedAt" TIMESTAMP(3),
    "notes" TEXT,
    "distributionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Agreement_distributionId_idx" ON "Agreement"("distributionId");

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "AssetDistribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
