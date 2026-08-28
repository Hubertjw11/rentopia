import { Request } from "express";


export const verifiedEmailFor = (user: Request["user"]): string | null => {
  if (!user?.emailVerified) return null;
  const email = user.email?.trim().toLowerCase();
  return email ? email : null;
};

export const isVerifiedContact = (
  publishedEmail: string | null | undefined,
  verifiedEmail: string | null | undefined,
): boolean => {
  if (!publishedEmail || !verifiedEmail) return false;
  return publishedEmail.trim().toLowerCase() === verifiedEmail.trim().toLowerCase();
};