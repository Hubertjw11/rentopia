-- CreateEnum
CREATE TYPE "Furnishing" AS ENUM ('Full', 'Semi', 'Unfurnished');

-- AlterTable: square feet become square metres (Indonesia quotes m2, not sq ft).
-- Renamed rather than dropped so existing listings keep their value, then
-- converted in place. GREATEST guards the smallest rooms against rounding to 0.
ALTER TABLE "Property" RENAME COLUMN "squareFeet" TO "areaSqm";
UPDATE "Property" SET "areaSqm" = GREATEST(1, ROUND("areaSqm" / 10.7639)::int);

-- AlterTable: nullable, because listings created before this column existed
-- have no furnishing recorded. New listings require one in the form.
ALTER TABLE "Property" ADD COLUMN "furnishing" "Furnishing";