-- CreateEnum
CREATE TYPE "RentalPeriod" AS ENUM ('Daily', 'Weekly', 'Monthly', 'Yearly');

-- AlterTable: a price is only "per month" when the listing is let monthly.
-- Renamed rather than dropped so existing prices survive. Every listing that
-- exists today is monthly, so the default matches reality and no backfill runs.
ALTER TABLE "Property" RENAME COLUMN "pricePerMonth" TO "price";
ALTER TABLE "Property" ADD COLUMN "rentalPeriod" "RentalPeriod" NOT NULL DEFAULT 'Monthly';

-- AlterTable: how many periods the tenant asked for. Null on applications
-- submitted before the field existed; approval falls back to a default term.
ALTER TABLE "Application" ADD COLUMN "durationPeriods" INTEGER;