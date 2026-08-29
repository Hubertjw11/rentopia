-- CreateEnum
CREATE TYPE "ViewingMode" AS ENUM ('InPerson', 'Virtual');

-- AlterEnum: notifications for the new booking flow.
ALTER TYPE "NotificationType" ADD VALUE 'ViewingBooked';
ALTER TYPE "NotificationType" ADD VALUE 'ViewingCancelled';

-- CreateTable: explicit slots a manager publishes, not recurring rules.
-- bookedByCognitoId is null while free, which is what makes the claim atomic.
CREATE TABLE "ViewingSlot" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "mode" "ViewingMode" NOT NULL,
    "meetingUrl" TEXT,
    "bookedByCognitoId" TEXT,
    "bookedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViewingSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ViewingSlot_propertyId_startsAt_idx" ON "ViewingSlot"("propertyId", "startsAt");
CREATE INDEX "ViewingSlot_bookedByCognitoId_startsAt_idx" ON "ViewingSlot"("bookedByCognitoId", "startsAt");

-- AddForeignKey: deleting a property removes its slots; deleting a tenant
-- frees their bookings rather than destroying the manager's slot.
ALTER TABLE "ViewingSlot" ADD CONSTRAINT "ViewingSlot_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ViewingSlot" ADD CONSTRAINT "ViewingSlot_bookedByCognitoId_fkey"
    FOREIGN KEY ("bookedByCognitoId") REFERENCES "Tenant"("cognitoId") ON DELETE SET NULL ON UPDATE CASCADE;