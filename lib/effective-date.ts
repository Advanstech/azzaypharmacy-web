/**
 * effectiveToday — always returns actual calendar today.
 * Do NOT fall back to the last sale date; that causes data integrity
 * issues where yesterday's sales appear labelled as "Today".
 */
export function getEffectiveToday(_sales?: { createdAt: string | Date }[]): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * getEffectiveDateRange — returns { from, to } spanning from the 1st of the
 * current calendar month to today.
 */
export function getEffectiveDateRange(_sales?: { createdAt: string | Date }[]): { from: string; to: string } {
  const to = getEffectiveToday();
  const d = new Date(to);
  const from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  return { from, to };
}
