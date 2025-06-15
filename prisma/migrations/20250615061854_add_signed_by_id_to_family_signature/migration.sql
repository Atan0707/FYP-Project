/*
  Warnings:

  - Added the required column `signedById` to the `FamilySignature` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FamilySignature" ADD COLUMN     "signedById" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "FamilySignature_signedById_idx" ON "FamilySignature"("signedById");

-- AddForeignKey
ALTER TABLE "FamilySignature" ADD CONSTRAINT "FamilySignature_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
