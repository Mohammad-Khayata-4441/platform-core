/**
 * Client-side single-flight refresh coordinator. Concurrent callers share the
 * one in-flight refresh request instead of each firing their own — this
 * satisfies "queued retries" without a manual queue: every caller just awaits
 * the same promise.
 */
export function createRefreshCoordinator(refreshUrl: string) {
  let inFlight: Promise<boolean> | null = null;

  return function refreshOnce(): Promise<boolean> {
    if (!inFlight) {
      inFlight = fetch(refreshUrl, { method: 'POST', credentials: 'include' })
        .then((res) => res.ok)
        .catch(() => false)
        .finally(() => {
          inFlight = null;
        });
    }
    return inFlight;
  };
}
