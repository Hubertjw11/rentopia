const DATE_LOCALE = "en-GB";
const TIME_LOCALE = "id-ID";

type DateLike = string | number | Date;

const asDate = (value: DateLike) =>
  value instanceof Date ? value : new Date(value);

export const formatDate = (value: DateLike) =>
  asDate(value).toLocaleDateString(DATE_LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const formatMonthYear = (value: DateLike) =>
  asDate(value).toLocaleDateString(DATE_LOCALE, {
    month: "short",
    year: "numeric",
  });

export const formatTime = (value: DateLike) =>
  asDate(value).toLocaleTimeString(TIME_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

export const formatDateTime = (value: DateLike) =>
  `${formatDate(value)}, ${formatTime(value)}`;

export const formatShortDateTime = (value: DateLike) => {
  const date = asDate(value);
  const day = date.toLocaleDateString(DATE_LOCALE, {
    day: "numeric",
    month: "short",
  });
  return `${day}, ${formatTime(date)}`;
};

export const formatDayLabel = (value: DateLike) => {
  const date = asDate(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return formatDate(date);
};

export const formatSlotTime = (startsAt: DateLike, minutes: number) => {
  const start = asDate(startsAt);
  const end = new Date(start.getTime() + minutes * 60_000);
  const weekday = start.toLocaleDateString(DATE_LOCALE, { weekday: "short" });
  const day = start.toLocaleDateString(DATE_LOCALE, {
    day: "numeric",
    month: "short",
  });
  return `${weekday}, ${day} · ${formatTime(start)}–${formatTime(end)}`;
};