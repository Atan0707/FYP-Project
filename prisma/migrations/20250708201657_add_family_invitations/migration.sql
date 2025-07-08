-- CreateTable
CREATE TABLE "FamilyInvitation" (
    "id" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "invitationToken" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT,
    "inviteeEmail" TEXT NOT NULL,
    "inviteeIC" TEXT NOT NULL,
    "inviteeFullName" TEXT NOT NULL,
    "inviteePhone" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FamilyInvitation_invitationToken_key" ON "FamilyInvitation"("invitationToken");

-- CreateIndex
CREATE INDEX "FamilyInvitation_inviterId_idx" ON "FamilyInvitation"("inviterId");

-- CreateIndex
CREATE INDEX "FamilyInvitation_inviteeId_idx" ON "FamilyInvitation"("inviteeId");

-- CreateIndex
CREATE INDEX "FamilyInvitation_invitationToken_idx" ON "FamilyInvitation"("invitationToken");

-- AddForeignKey
ALTER TABLE "FamilyInvitation" ADD CONSTRAINT "FamilyInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyInvitation" ADD CONSTRAINT "FamilyInvitation_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
