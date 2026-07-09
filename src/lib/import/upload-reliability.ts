export type UploadRetryOptions = {
  attempts?: number;
  delayMs?: number;
};

const RETRYABLE_PATTERNS = [
  /failed to fetch/i,
  /networkerror/i,
  /network request failed/i,
  /fetch failed/i,
  /load failed/i,
  /timeout/i,
  /timed out/i,
  /econnreset/i,
  /enotfound/i,
  /socket hang up/i,
];

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Upload failed";
}

export function isRetryableUploadError(error: unknown): boolean {
  const message = errorMessage(error);
  return RETRYABLE_PATTERNS.some((pattern) => pattern.test(message));
}

export function formatUploadError(error: unknown): string {
  const message = errorMessage(error);
  if (/failed to fetch/i.test(message) || /networkerror/i.test(message) || /fetch failed/i.test(message)) {
    return "Upload failed due to a network error. Check your connection and try again.";
  }
  return message || "Upload failed";
}

export async function withUploadRetries<T>(
  fn: () => Promise<T>,
  options: UploadRetryOptions = {}
): Promise<T> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const delayMs = Math.max(0, options.delayMs ?? 500);
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const canRetry = attempt < attempts && isRetryableUploadError(error);
      if (!canRetry) throw error;
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError;
}
