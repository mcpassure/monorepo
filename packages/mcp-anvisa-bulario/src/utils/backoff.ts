export class SourceAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceAuthError";
  }
}

export class MaxRetriesExceededError extends Error {
  constructor(url: string, retries: number, cause?: Error) {
    super(`Max retries (${retries}) exceeded for ${url}: ${cause?.message}`);
    this.name = "MaxRetriesExceededError";
    this.cause = cause;
  }
}

function jitter(baseMs: number): number {
  return Math.floor(Math.random() * baseMs);
}

export async function withBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseDelayMs: number,
  url: string
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (error instanceof SourceAuthError) {
        throw error;
      }

      lastError = error;

      if (attempt < maxRetries) {
        const delay = baseDelayMs * 2 ** (attempt - 1) + jitter(baseDelayMs);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new MaxRetriesExceededError(url, maxRetries, lastError);
}
