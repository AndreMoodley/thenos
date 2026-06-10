-- CreateEnum
CREATE TYPE "TrialGoalKind" AS ENUM ('breakthrough', 'open_path');

-- CreateEnum
CREATE TYPE "TrialExperience" AS ENUM ('novice', 'practiced', 'seasoned');

-- CreateEnum
CREATE TYPE "TrialStatus" AS ENUM ('active', 'completed', 'abandoned');

-- CreateEnum
CREATE TYPE "PlannedKind" AS ENUM ('flow', 'surge', 'pillar', 'gate', 'stillness');

-- CreateEnum
CREATE TYPE "RealignmentKind" AS ENUM ('ease', 'intensify', 'realign_missed');

-- CreateEnum
CREATE TYPE "RealignmentStatus" AS ENUM ('proposed', 'accepted', 'dismissed');

-- CreateEnum
CREATE TYPE "SagaStatus" AS ENUM ('active', 'completed', 'archived');

-- CreateTable
CREATE TABLE "Trial" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "goalKind" "TrialGoalKind" NOT NULL,
    "goalLabel" TEXT,
    "focusModality" "Modality" NOT NULL,
    "experience" "TrialExperience" NOT NULL,
    "ability" JSONB NOT NULL,
    "sessionsPerWeek" INTEGER NOT NULL,
    "pillarDay" INTEGER NOT NULL,
    "volumeDial" INTEGER NOT NULL,
    "difficultyDial" INTEGER NOT NULL,
    "totalWeeks" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "targetDate" TIMESTAMP(3),
    "status" "TrialStatus" NOT NULL DEFAULT 'active',
    "generatorVersion" INTEGER NOT NULL DEFAULT 1,
    "vowId" TEXT,
    "chainedFromId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannedSession" (
    "id" TEXT NOT NULL,
    "trialId" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "scheduledOn" TIMESTAMP(3) NOT NULL,
    "kind" "PlannedKind" NOT NULL,
    "modality" "Modality" NOT NULL,
    "targetReps" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "fulfilledBySessionId" TEXT,
    "fulfilledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlannedSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrialRealignment" (
    "id" TEXT NOT NULL,
    "trialId" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "kind" "RealignmentKind" NOT NULL,
    "reason" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "RealignmentStatus" NOT NULL DEFAULT 'proposed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "TrialRealignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoulProfile" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "currentSelf" TEXT NOT NULL,
    "higherSelf" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "obstacleCategory" "LeakCategory" NOT NULL,
    "obstacleName" TEXT NOT NULL,
    "obstacleDetail" TEXT NOT NULL,
    "wardPlan" TEXT NOT NULL,
    "styleKey" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SoulProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Saga" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "styleKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "synopsis" TEXT NOT NULL,
    "demonName" TEXT NOT NULL,
    "status" "SagaStatus" NOT NULL DEFAULT 'active',
    "spec" JSONB NOT NULL,
    "promptHash" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'claude',
    "trialId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Saga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SagaChapter" (
    "id" TEXT NOT NULL,
    "sagaId" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "beatKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tease" TEXT NOT NULL,
    "prose" TEXT,
    "proseSource" TEXT,
    "promptHash" TEXT,
    "trigger" JSONB NOT NULL,
    "optional" BOOLEAN NOT NULL DEFAULT false,
    "unlockedAt" TIMESTAMP(3),
    "unlockedBy" JSONB,

    CONSTRAINT "SagaChapter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trial_vowId_key" ON "Trial"("vowId");

-- CreateIndex
CREATE INDEX "Trial_practitionerId_status_idx" ON "Trial"("practitionerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PlannedSession_fulfilledBySessionId_key" ON "PlannedSession"("fulfilledBySessionId");

-- CreateIndex
CREATE INDEX "PlannedSession_practitionerId_scheduledOn_idx" ON "PlannedSession"("practitionerId", "scheduledOn");

-- CreateIndex
CREATE INDEX "PlannedSession_trialId_scheduledOn_idx" ON "PlannedSession"("trialId", "scheduledOn");

-- CreateIndex
CREATE INDEX "TrialRealignment_trialId_status_idx" ON "TrialRealignment"("trialId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SoulProfile_practitionerId_key" ON "SoulProfile"("practitionerId");

-- CreateIndex
CREATE INDEX "Saga_practitionerId_status_idx" ON "Saga"("practitionerId", "status");

-- CreateIndex
CREATE INDEX "SagaChapter_practitionerId_unlockedAt_idx" ON "SagaChapter"("practitionerId", "unlockedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SagaChapter_sagaId_index_key" ON "SagaChapter"("sagaId", "index");

-- AddForeignKey
ALTER TABLE "Trial" ADD CONSTRAINT "Trial_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trial" ADD CONSTRAINT "Trial_vowId_fkey" FOREIGN KEY ("vowId") REFERENCES "Vow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedSession" ADD CONSTRAINT "PlannedSession_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "Trial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedSession" ADD CONSTRAINT "PlannedSession_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedSession" ADD CONSTRAINT "PlannedSession_fulfilledBySessionId_fkey" FOREIGN KEY ("fulfilledBySessionId") REFERENCES "VoidSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialRealignment" ADD CONSTRAINT "TrialRealignment_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "Trial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrialRealignment" ADD CONSTRAINT "TrialRealignment_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoulProfile" ADD CONSTRAINT "SoulProfile_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Saga" ADD CONSTRAINT "Saga_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SagaChapter" ADD CONSTRAINT "SagaChapter_sagaId_fkey" FOREIGN KEY ("sagaId") REFERENCES "Saga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SagaChapter" ADD CONSTRAINT "SagaChapter_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
