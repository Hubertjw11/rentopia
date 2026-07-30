export const parseId = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};