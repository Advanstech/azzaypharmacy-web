export function shouldQueueOfflineMutation(err: unknown): boolean {
  const raw = typeof err === 'string'
    ? err
    : err instanceof Error
      ? err.message
      : err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : String(err ?? '');
  const message = raw.toLowerCase();

  if (!message) return false;

  const looksNetworkish = /networkerror|failed to fetch|fetch failed|timeout|timed out|unreachable|premature|abort|econnrefused|connection reset|connection refused|signal timed out|offline|socket hang up|load failed|service unavailable|bad gateway|gateway timeout|too many requests/.test(message);
  const looksTransientHttp = /\b(?:http(?: error)?\s*|status(?: code)?\s*[:=]?\s*)(?:408|425|429|5\d\d)\b/.test(message);
  const looksAuth = /\b(?:401|403)\b|unauthorized|forbidden|invalid token|bad credentials|token expired/.test(message);
  const looksValidation = /validation failed|bad request|invalid|duplicate|already exists|required|must be|not found|not authorized|conflict/.test(message);

  return (looksNetworkish || looksTransientHttp) && !looksAuth && !looksValidation;
}

export function canSyncQueuedOperation(ownerUserId: string | undefined, currentUserId: string | null): boolean {
  return !!ownerUserId && !!currentUserId && ownerUserId === currentUserId;
}
