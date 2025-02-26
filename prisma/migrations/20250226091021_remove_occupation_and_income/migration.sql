/*
  Warnings:

  - You are about to drop the column `income` on the `Family` table. All the data in the column will be lost.
  - You are about to drop the column `occupation` on the `Family` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Family" DROP COLUMN "income",
DROP COLUMN "occupation";
