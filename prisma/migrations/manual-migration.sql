-- Step 1: Create the new FamilySignature table
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

-- Step 2: Create a temporary table to hold one Agreement per distribution
CREATE TABLE "AgreementTemp" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "adminSignedAt" TIMESTAMP(3),
    "adminNotes" TEXT,
    "distributionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgreementTemp_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AgreementTemp_distributionId_key" UNIQUE ("distributionId")
);

-- Step 3: Insert one agreement per distribution into the temporary table
INSERT INTO "AgreementTemp" ("id", "status", "adminSignedAt", "adminNotes", "distributionId", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text, 
    CASE 
        WHEN EXISTS (SELECT 1 FROM "Agreement" a2 WHERE a2."distributionId" = a."distributionId" AND a2."status" = 'completed') THEN 'completed'
        WHEN EXISTS (SELECT 1 FROM "Agreement" a2 WHERE a2."distributionId" = a."distributionId" AND a2."status" = 'pending_admin') THEN 'pending_admin'
        WHEN EXISTS (SELECT 1 FROM "Agreement" a2 WHERE a2."distributionId" = a."distributionId" AND a2."status" = 'signed') THEN 'in_progress'
        ELSE 'pending'
    END,
    (SELECT MAX(a2."adminSignedAt") FROM "Agreement" a2 WHERE a2."distributionId" = a."distributionId"),
    (SELECT a2."notes" FROM "Agreement" a2 WHERE a2."distributionId" = a."distributionId" AND a2."adminSignedAt" IS NOT NULL LIMIT 1),
    a."distributionId",
    (SELECT MIN(a2."createdAt") FROM "Agreement" a2 WHERE a2."distributionId" = a."distributionId"),
    NOW()
FROM "Agreement" a
GROUP BY a."distributionId";

-- Step 4: Transfer all family-specific data to the new FamilySignature table
INSERT INTO "FamilySignature" ("id", "familyId", "status", "signedAt", "notes", "agreementId", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::text,
    a."familyId",
    CASE 
        WHEN a."status" = 'completed' THEN 'signed'
        WHEN a."status" = 'pending_admin' THEN 'signed'
        ELSE a."status"
    END,
    a."signedAt",
    a."notes",
    (SELECT at."id" FROM "AgreementTemp" at WHERE at."distributionId" = a."distributionId"),
    a."createdAt",
    NOW()
FROM "Agreement" a;

-- Step 5: Drop the old Agreement table and constraints
ALTER TABLE "Agreement" DROP CONSTRAINT IF EXISTS "Agreement_distributionId_fkey";
DROP INDEX IF EXISTS "Agreement_distributionId_idx";
DROP TABLE "Agreement";

-- Step 6: Rename the temp table to be the new Agreement table
ALTER TABLE "AgreementTemp" RENAME TO "Agreement";

-- Step 7: Create all necessary constraints and indexes
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_distributionId_fkey" 
    FOREIGN KEY ("distributionId") REFERENCES "AssetDistribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "FamilySignature_agreementId_idx" ON "FamilySignature"("agreementId");

ALTER TABLE "FamilySignature" ADD CONSTRAINT "FamilySignature_agreementId_fkey" 
    FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE CASCADE ON UPDATE CASCADE; 