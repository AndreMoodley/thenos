-- CreateTable
CREATE TABLE "Contemplation" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "hexagram" INTEGER NOT NULL,
    "changing" INTEGER[],
    "transformed" INTEGER NOT NULL,
    "note" TEXT,
    "kiGain" INTEGER NOT NULL DEFAULT 0,
    "day" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contemplation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contemplation_practitionerId_day_key" ON "Contemplation"("practitionerId", "day");

-- CreateIndex
CREATE INDEX "Contemplation_practitionerId_createdAt_idx" ON "Contemplation"("practitionerId", "createdAt");

-- AddForeignKey
ALTER TABLE "Contemplation" ADD CONSTRAINT "Contemplation_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "Practitioner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
