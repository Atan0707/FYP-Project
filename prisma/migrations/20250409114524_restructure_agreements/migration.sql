/*
  Warnings:

  - You are about to drop the column `familyId` on the `Agreement` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Agreement` table. All the data in the column will be lost.
  - You are about to drop the column `signedAt` on the `Agreement` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[distributionId]` on the table `Agreement` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Agreement_distributionId_idx";

-- AlterTable
ALTER TABLE "Agreement" DROP COLUMN "familyId",
DROP COLUMN "notes",
DROP COLUMN "signedAt",
ADD COLUMN     "adminNotes" TEXT;

-- CreateTable
CREATE TABLE "FamilySignature" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "signedAt" TIMESTAMP(3),
    "notes" TEXT,
    "agreementId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilySignature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FamilySignature_agreementId_idx" ON "FamilySignature"("agreementId");

-- CreateIndex
CREATE UNIQUE INDEX "Agreement_distributionId_key" ON "Agreement"("distributionId");

-- AddForeignKey
ALTER TABLE "FamilySignature" ADD CONSTRAINT "FamilySignature_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
