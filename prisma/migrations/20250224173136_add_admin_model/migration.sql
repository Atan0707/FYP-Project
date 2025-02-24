-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isRegistered" BOOLEAN NOT NULL DEFAULT false,
    "pendingIc" TEXT,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FamilyMember_userId_addedById_key" ON "FamilyMember"("userId", "addedById");

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
