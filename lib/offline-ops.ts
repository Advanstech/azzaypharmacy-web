export function shouldQueueOfflineMutation(err: any): boolean {
  const raw = err?.message ?? err?.toString?.() ?? String(err) ?? '';
  const message = raw.toLowerCase();

  if (!message) return false;

  const looksNetworkish = /networkerror|failed to fetch|fetch failed|timeout|timed out|unreachable|premature|abort|econnrefused|connection reset|connection refused|signal timed out|offline|socket hang up|load failed/.test(message);
  const looksAuth = /401|unauthorized|forbidden|invalid token|bad credentials|token expired/.test(message);
  const looksValidation = /validation failed|bad request|invalid|duplicate|already exists|required|must be|not found|not authorized|conflict/.test(message);

  return looksNetworkish && !looksAuth && !looksValidation;
}
