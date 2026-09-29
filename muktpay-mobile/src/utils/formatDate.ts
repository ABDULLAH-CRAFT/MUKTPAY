/** "21 Sep, 3:45 pm" — for bill history, where the date matters more than the exact second. */
export function formatShortDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' });
}
