-- AlterTable: the email address Cognito has actually confirmed, mirrored from
-- the ID token. Nullable because it is unknown until the account signs in once,
-- and separate from "email" because that one is free text the user can edit.
ALTER TABLE "Manager" ADD COLUMN "verifiedEmail" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "verifiedEmail" TEXT;