/**
 * effectiveToday — returns the most recent date that has sales data.
 * Falls back to actual today when there are no sales or today has data.
 *
 * This handles migrated/historical datasets where all data may predate today.
 */
export function getEffectiveToday(sales: { createdAt: string | Date }[]): string {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayHasData = sales.some(
    s => new Date(s.createdAt).toISOString().split('T')[0] === todayStr
  );
  if (todayHasData || sales.length === 0) return todayStr;

  // Return most recent date with sales
  let latest = '';
  for (const s of sales) {
    const d = new Date(s.createdAt).toISOString().split('T')[0];
    if (d > latest) latest = d;
  }
  return latest || todayStr;
}

/**
 * getEffectiveDateRange — returns { from, to } ISO date strings
 * spanning from first-of-month of the effective date to the effective date.
 */
export function getEffectiveDateRange(sales: { createdAt: string | Date }[]): { from: string; to: string } {
  const to = getEffectiveToday(sales);
  const d = new Date(to);
  const from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  return { from, to };
}
