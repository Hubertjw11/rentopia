import { RentalPeriodEnum } from "@/lib/constants";

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
  period: RentalPeriodEnum,
  count: number,
): Date => {
  const next = new Date(date);
  switch (period) {
    case RentalPeriodEnum.Daily:
      next.setDate(next.getDate() + count);
      return next;
    case RentalPeriodEnum.Weekly:
      next.setDate(next.getDate() + count * 7);
      return next;
    case RentalPeriodEnum.Yearly:
      return addMonths(next, count * 12);
    default:
      return addMonths(next, count);
  }
};

export const nextDueDate = (
  startDate: string,
  period: RentalPeriodEnum,
): Date => {
  const today = new Date();
  const start = new Date(startDate);
  let periods = 0;
  let next = new Date(start);
  while (next <= today) {
    next = addPeriods(start, period, ++periods);
  }
  return next;
};