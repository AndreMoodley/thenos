-- AlterTable
ALTER TABLE "WagerEvent" ADD COLUMN     "criterion" JSONB,
ADD COLUMN     "resolveAt" TIMESTAMP(3);
