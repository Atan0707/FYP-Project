-- CreateTable
CREATE TABLE "TemporaryAgreementVerification" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemporaryAgreementVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TemporaryAgreementVerification_agreementId_idx" ON "TemporaryAgreementVerification"("agreementId");

-- CreateIndex
CREATE INDEX "TemporaryAgreementVerification_userId_idx" ON "TemporaryAgreementVerification"("userId");

-- CreateIndex
CREATE INDEX "TemporaryAgreementVerification_verificationCode_idx" ON "TemporaryAgreementVerification"("verificationCode");
