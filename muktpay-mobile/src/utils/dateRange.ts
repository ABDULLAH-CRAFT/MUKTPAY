/** A from/to pair the backend's date filters and summary endpoint accept. */
export interface DateRange {
  from: string;
  to: string;
}

/** Local midnight today through local midnight tomorrow — "today" as this phone understands it. */
export function todayRange(): DateRange {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { from: start.toISOString(), to: end.toISOString() };
}

/** The last 7 days, ending at the start of tomorrow so today is included in full. */
export function last7DaysRange(): DateRange {
  const { to } = todayRange();
  const from = new Date(new Date(to).getTime() - 7 * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to };
}