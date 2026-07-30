-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'NewMessage';

-- CreateTable
CREATE TABLE "Conversation" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "tenantCognitoId" TEXT NOT NULL,
    "managerCognitoId" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "senderCognitoId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Conversation_managerCognitoId_lastMessageAt_idx" ON "Conversation"("managerCognitoId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "Conversation_tenantCognitoId_lastMessageAt_idx" ON "Conversation"("tenantCognitoId", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_propertyId_tenantCognitoId_key" ON "Conversation"("propertyId", "tenantCognitoId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_tenantCognitoId_fkey" FOREIGN KEY ("tenantCognitoId") REFERENCES "Tenant"("cognitoId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_managerCognitoId_fkey" FOREIGN KEY ("managerCognitoId") REFERENCES "Manager"("cognitoId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
