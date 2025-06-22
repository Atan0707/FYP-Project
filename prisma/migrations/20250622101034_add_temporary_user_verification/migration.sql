-- CreateTable
CREATE TABLE "TemporaryUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "ic" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemporaryUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TemporaryUser_email_key" ON "TemporaryUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TemporaryUser_ic_key" ON "TemporaryUser"("ic");

-- CreateIndex
CREATE INDEX "TemporaryUser_email_idx" ON "TemporaryUser"("email");

-- CreateIndex
CREATE INDEX "TemporaryUser_verificationCode_idx" ON "TemporaryUser"("verificationCode");
