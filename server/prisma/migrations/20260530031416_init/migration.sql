-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Modality" AS ENUM ('origin', 'pull', 'push', 'core', 'cardio', 'recovery');

-- CreateEnum
CREATE TYPE "LeakCategory" AS ENUM ('social', 'food', 'media', 'argument', 'validation', 'doubt');

-- CreateEnum
CREATE TYPE "VowType" AS ENUM ('major', 'minor');

-- CreateEnum
CREATE TYPE "VowStatus" AS ENUM ('active', 'kept', 'broken', 'cancelled');

-- CreateEnum
CREATE TYPE "WagerStatus" AS ENUM ('none', 'pending', 'won', 'lost', 'settled');

-- CreateEnum
CREATE TYPE "FormTier" AS ENUM ('free', 'premium', 'transcendent');

-- CreateEnum
CREATE TYPE "CosmeticCategory" AS ENUM ('trail', 'aura', 'core', 'surface', 'eyes', 'appendages', 'orbit', 'sigils');

-- CreateEnum
CREATE TYPE "Rarity" AS ENUM ('free', 'standard', 'premium', 'seasonal', 'event');

-- CreateEnum
CREATE TYPE "CompanionRarity" AS ENUM ('wandering', 'bound', 'ancient', 'void_herald');

-- CreateEnum
CREATE TYPE "ScrollType" AS ENUM ('lesser', 'abyssal');

-- CreateEnum
CREATE TYPE "WagerKind" AS ENUM ('heavenly_restriction', 'wagered_ki');

-- CreateEnum
CREATE TYPE "EntitlementKind" AS ENUM ('form', 'domain', 'bloodline', 'cosmetic', 'aura', 'artifact');

-- CreateTable
CREATE TABLE "Practitioner" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "ki" INTEGER NOT NULL DEFAULT 100,
    "shadowLevel" INTEGER NOT NULL DEFAULT 1,
    "hammerCount" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "lastLogDate" TIMESTAMP(3),
    "anchorCompletedAt" TIMESTAMP(3),
    "crystals" INTEGER NOT NULL DEFAULT 0,
    "corruptedSince" TIMESTAMP(3),
    "penanceProgress" INTEGER NOT NULL DEFAULT 0,
    "restrictionScars" INTEGER NOT NULL DEFAULT 0,
    "dormantSince" TIMESTAMP(3),
    "pullsSinceAncient" INTEGER NOT NULL DEFAULT 0,
    "pullsSinceHerald" INTEGER NOT NULL DEFAULT 0,
    "activeFormKey" TEXT NOT NULL DEFAULT 'void',
    "activeDomainKey" TEXT NOT NULL DEFAULT 'dojo',
    "activeManifestationPresetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Practitioner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PractitionerEntity" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "activeCompanionId" TEXT,
    "activeBloodlineId" TEXT,
    "demeanor" TEXT NOT NULL DEFAULT 'neutral',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PractitionerEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrikeEvent" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "sessionId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrikeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoidSession" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "modality" "Modality" NOT NULL,
    "reps" INTEGER NOT NULL,
    "rating" INTEGER,
    "note" TEXT,
    "occurredOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT,

    CONSTRAINT "VoidSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KiLeak" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "category" "LeakCategory" NOT NULL,
    "label" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT,

    CONSTRAINT "KiLeak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vow" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "VowType" NOT NULL,
    "vowSubtype" TEXT,
    "status" "VowStatus" NOT NULL DEFAULT 'active',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolutionDate" TIMESTAMP(3) NOT NULL,
    "wagerAmount" INTEGER NOT NULL DEFAULT 0,
    "wagerStatus" "WagerStatus" NOT NULL DEFAULT 'none',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Progression" (
    "id" TEXT NOT NULL,
    "vowId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Progression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityForm" (
    "formKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" "FormTier" NOT NULL,
    "stageAssets" JSONB NOT NULL,
    "priceModel" JSONB NOT NULL,

    CONSTRAINT "EntityForm_pkey" PRIMARY KEY ("formKey")
);

-- CreateTable
CREATE TABLE "PractitionerForm" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "formKey" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PractitionerForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CosmeticItem" (
    "itemKey" TEXT NOT NULL,
    "category" "CosmeticCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" "Rarity" NOT NULL,
    "defaultTint" TEXT,
    "layerSpec" JSONB NOT NULL,
    "priceModel" JSONB NOT NULL,
    "setKey" TEXT,
    "availableFrom" TIMESTAMP(3),
    "availableTo" TIMESTAMP(3),

    CONSTRAINT "CosmeticItem_pkey" PRIMARY KEY ("itemKey")
);

-- CreateTable
CREATE TABLE "PractitionerCosmetic" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "cosmeticItemId" TEXT NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PractitionerCosmetic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManifestationPreset" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManifestationPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainPack" (
    "domainKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aesthetic" TEXT NOT NULL,
    "tapEffect" TEXT NOT NULL,
    "kiBarMaterial" TEXT NOT NULL,
    "soundscapeKey" TEXT NOT NULL,
    "domainConfig" JSONB NOT NULL,
    "priceModel" JSONB NOT NULL,
    "availableFrom" TIMESTAMP(3),
    "availableTo" TIMESTAMP(3),

    CONSTRAINT "DomainPack_pkey" PRIMARY KEY ("domainKey")
);

-- CreateTable
CREATE TABLE "PractitionerDomain" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "domainKey" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PractitionerDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpaceDecor" (
    "decorKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "priceModel" JSONB NOT NULL,

    CONSTRAINT "SpaceDecor_pkey" PRIMARY KEY ("decorKey")
);

-- CreateTable
CREATE TABLE "PractitionerDecor" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "decorKey" TEXT NOT NULL,
    "placement" JSONB,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PractitionerDecor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bloodline" (
    "bloodlineKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stageAssets" JSONB NOT NULL,
    "lockedSlots" JSONB NOT NULL,
    "priceModel" JSONB NOT NULL,

    CONSTRAINT "Bloodline_pkey" PRIMARY KEY ("bloodlineKey")
);

-- CreateTable
CREATE TABLE "PractitionerBloodline" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "bloodlineKey" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PractitionerBloodline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Companion" (
    "companionKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" "CompanionRarity" NOT NULL,
    "utility" TEXT NOT NULL,
    "inLesserPool" BOOLEAN NOT NULL DEFAULT true,
    "inAbyssalPool" BOOLEAN NOT NULL DEFAULT true,
    "weight" INTEGER NOT NULL DEFAULT 100,

    CONSTRAINT "Companion_pkey" PRIMARY KEY ("companionKey")
);

-- CreateTable
CREATE TABLE "PractitionerCompanion" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "companionKey" TEXT NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PractitionerCompanion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanionSummon" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "scrollType" "ScrollType" NOT NULL,
    "companionKey" TEXT NOT NULL,
    "wasPity" BOOLEAN NOT NULL DEFAULT false,
    "rolledValue" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanionSummon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WagerEvent" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "kind" "WagerKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'crystal',
    "status" "WagerStatus" NOT NULL DEFAULT 'pending',
    "vowId" TEXT,
    "stripePaymentIntentId" TEXT,
    "weekOf" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "WagerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entitlement" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "kind" "EntitlementKind" NOT NULL,
    "productKey" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'revenuecat',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bond" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "lastPresenceDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bond_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "seasonKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "dropKeys" JSONB NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("seasonKey")
);

-- CreateTable
CREATE TABLE "Sect" (
    "sectKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sect_pkey" PRIMARY KEY ("sectKey")
);

-- CreateTable
CREATE TABLE "SectMember" (
    "id" TEXT NOT NULL,
    "sectKey" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachReflection" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "occasion" TEXT NOT NULL,
    "promptHash" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'claude',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachReflection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Practitioner_email_key" ON "Practitioner"("email");

-- CreateIndex
CREATE INDEX "Practitioner_email_idx" ON "Practitioner"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PractitionerEntity_practitionerId_key" ON "PractitionerEntity"("practitionerId");

-- CreateIndex
CREATE INDEX "StrikeEvent_practitionerId_occurredAt_idx" ON "StrikeEvent"("practitionerId", "occurredAt");

-- CreateIndex
CREATE INDEX "VoidSession_practitionerId_occurredOn_idx" ON "VoidSession"("practitionerId", "occurredOn");

-- CreateIndex
CREATE UNIQUE INDEX "VoidSession_practitionerId_clientId_key" ON "VoidSession"("practitionerId", "clientId");

-- CreateIndex
CREATE INDEX "KiLeak_practitionerId_occurredAt_idx" ON "KiLeak"("practitionerId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "KiLeak_practitionerId_clientId_key" ON "KiLeak"("practitionerId", "clientId");

-- CreateIndex
CREATE INDEX "Vow_practitionerId_status_idx" ON "Vow"("practitionerId", "status");

-- CreateIndex
CREATE INDEX "Progression_vowId_orderIndex_idx" ON "Progression"("vowId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "PractitionerForm_practitionerId_formKey_key" ON "PractitionerForm"("practitionerId", "formKey");

-- CreateIndex
CREATE INDEX "CosmeticItem_category_idx" ON "CosmeticItem"("category");

-- CreateIndex
CREATE INDEX "CosmeticItem_setKey_idx" ON "CosmeticItem"("setKey");

-- CreateIndex
CREATE UNIQUE INDEX "PractitionerCosmetic_practitionerId_cosmeticItemId_key" ON "PractitionerCosmetic"("practitionerId", "cosmeticItemId");

-- CreateIndex
CREATE INDEX "ManifestationPreset_practitionerId_idx" ON "ManifestationPreset"("practitionerId");

-- CreateIndex
CREATE UNIQUE INDEX "PractitionerDomain_practitionerId_domainKey_key" ON "PractitionerDomain"("practitionerId", "domainKey");

-- CreateIndex
CREATE UNIQUE INDEX "PractitionerDecor_practitionerId_decorKey_key" ON "PractitionerDecor"("practitionerId", "decorKey");

-- CreateIndex
CREATE UNIQUE INDEX "PractitionerBloodline_practitionerId_bloodlineKey_key" ON "PractitionerBloodline"("practitionerId", "bloodlineKey");

-- CreateIndex
CREATE UNIQUE INDEX "PractitionerCompanion_practitionerId_companionKey_key" ON "PractitionerCompanion"("practitionerId", "companionKey");

-- CreateIndex
CREATE INDEX "CompanionSummon_practitionerId_createdAt_idx" ON "CompanionSummon"("practitionerId", "createdAt");

-- CreateIndex
CREATE INDEX "WagerEvent_practitionerId_status_idx" ON "WagerEvent"("practitionerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Entitlement_practitionerId_kind_productKey_key" ON "Entitlement"("practitionerId", "kind", "productKey");

-- CreateIndex
CREATE UNIQUE INDEX "Bond_practitionerId_key" ON "Bond"("practitionerId");

-- CreateIndex
CREATE UNIQUE INDEX "SectMember_sectKey_practitionerId_key" ON "SectMember"("sectKey", "practitionerId");

-- CreateIndex
CREATE INDEX "CoachReflection_practitionerId_occasion_createdAt_idx" ON "CoachReflection"("practitionerId", "occasion", "createdAt");

-- AddForeignKey
ALTER TABLE "PractitionerEntity" ADD CONSTRAINT "PractitionerEntity_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrikeEvent" ADD CONSTRAINT "StrikeEvent_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoidSession" ADD CONSTRAINT "VoidSession_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KiLeak" ADD CONSTRAINT "KiLeak_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vow" ADD CONSTRAINT "Vow_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progression" ADD CONSTRAINT "Progression_vowId_fkey" FOREIGN KEY ("vowId") REFERENCES "Vow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerForm" ADD CONSTRAINT "PractitionerForm_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerForm" ADD CONSTRAINT "PractitionerForm_formKey_fkey" FOREIGN KEY ("formKey") REFERENCES "EntityForm"("formKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerCosmetic" ADD CONSTRAINT "PractitionerCosmetic_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerCosmetic" ADD CONSTRAINT "PractitionerCosmetic_cosmeticItemId_fkey" FOREIGN KEY ("cosmeticItemId") REFERENCES "CosmeticItem"("itemKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManifestationPreset" ADD CONSTRAINT "ManifestationPreset_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerDomain" ADD CONSTRAINT "PractitionerDomain_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerDomain" ADD CONSTRAINT "PractitionerDomain_domainKey_fkey" FOREIGN KEY ("domainKey") REFERENCES "DomainPack"("domainKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerDecor" ADD CONSTRAINT "PractitionerDecor_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerDecor" ADD CONSTRAINT "PractitionerDecor_decorKey_fkey" FOREIGN KEY ("decorKey") REFERENCES "SpaceDecor"("decorKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerBloodline" ADD CONSTRAINT "PractitionerBloodline_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerBloodline" ADD CONSTRAINT "PractitionerBloodline_bloodlineKey_fkey" FOREIGN KEY ("bloodlineKey") REFERENCES "Bloodline"("bloodlineKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerCompanion" ADD CONSTRAINT "PractitionerCompanion_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PractitionerCompanion" ADD CONSTRAINT "PractitionerCompanion_companionKey_fkey" FOREIGN KEY ("companionKey") REFERENCES "Companion"("companionKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanionSummon" ADD CONSTRAINT "CompanionSummon_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanionSummon" ADD CONSTRAINT "CompanionSummon_companionKey_fkey" FOREIGN KEY ("companionKey") REFERENCES "Companion"("companionKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WagerEvent" ADD CONSTRAINT "WagerEvent_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entitlement" ADD CONSTRAINT "Entitlement_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bond" ADD CONSTRAINT "Bond_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectMember" ADD CONSTRAINT "SectMember_sectKey_fkey" FOREIGN KEY ("sectKey") REFERENCES "Sect"("sectKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectMember" ADD CONSTRAINT "SectMember_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachReflection" ADD CONSTRAINT "CoachReflection_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
