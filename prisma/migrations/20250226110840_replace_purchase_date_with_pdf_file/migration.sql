/*
  Warnings:

  - You are about to drop the column `purchaseDate` on the `Asset` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Asset" DROP COLUMN "purchaseDate",
ADD COLUMN     "pdfFile" TEXT;
