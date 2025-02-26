-- AlterTable
ALTER TABLE "Family" ADD COLUMN     "inverseRelationship" TEXT,
ADD COLUMN     "relatedUserId" TEXT;

-- AddForeignKey
ALTER TABLE "Family" ADD CONSTRAINT "Family_relatedUserId_fkey" FOREIGN KEY ("relatedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
