import { RentalPeriod } from "@prisma/client";

export const MONTHLY_FACTOR: Record<RentalPeriod, number> = {
  Daily: 30,
  Weekly: 4.345,
  Monthly: 1,
  Yearly: 1 / 12,
};

export const DEFAULT_PERIODS: Record<RentalPeriod, number> = {
  Daily: 30,
  Weekly: 12,
  Monthly: 12,
  Yearly: 1,
};

export const MAX_PERIODS: Record<RentalPeriod, number> = {
  Daily: 365,
  Weekly: 104,
  Monthly: 60,
  Yearly: 10,
};

export const PERIOD_NOUN: Record<RentalPeriod, string> = {
  Daily: "day",
  Weekly: "week",
  Monthly: "month",
  Yearly: "year",
};

export const PERIOD_ADVERB: Record<RentalPeriod, string> = {
  Daily: "daily",
  Weekly: "weekly",
  Monthly: "monthly",
  Yearly: "annually",
};

export const PERIOD_ADJECTIVE: Record<RentalPeriod, string> = {
  Daily: "Daily",
  Weekly: "Weekly",
  Monthly: "Monthly",
  Yearly: "Annual",
};

const addMonths = (date: Date, months: number): Date => {
  const day = date.getDate();
  const next = new Date(date);
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const lastDayOfMonth = new Date(
    next.getFullYear(),
    next.getMonth() + 1,
    0,
  ).getDate();
  next.setDate(Math.min(day, lastDayOfMonth));
  return next;
};

export const addPeriods = (
  date: Date,
  period: RentalPeriod,
  count: number,
): Date => {
  const next = new Date(date);
  switch (period) {
    case "Daily":
      next.setDate(next.getDate() + count);
      return next;
    case "Weekly":
      next.setDate(next.getDate() + count * 7);
      return next;
    case "Monthly":
      return addMonths(next, count);
    case "Yearly":
      return addMonths(next, count * 12);
  }
};

export const resolvePeriods = (
  period: RentalPeriod,
  requested: number | null,
): number => {
  if (requested === null) return DEFAULT_PERIODS[period];
  return Math.min(Math.max(1, Math.trunc(requested)), MAX_PERIODS[period]);
};