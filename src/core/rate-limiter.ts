/**
 * Token bucket rate limiter with lazy refill on acquire.
 */
export class RateLimiter {
  private static readonly defaultNow = Date.now;

  /** Remaining tokens in the current rate-limit window. */
  private tokens: number;
  /** Timestamp (ms) of the last token refill. */
  private lastRefill: number;
  /** Resolvers waiting for a token when the bucket is empty. */
  private waiters: Array<() => void> = [];

  /** Creates a rate limiter with the given burst size and window duration. */
  constructor(
    private readonly rateDelta: number,
    private readonly rateLimit: number,
    private readonly now: () => number = RateLimiter.defaultNow,
  ) {
    this.tokens = rateDelta;
    this.lastRefill = now();
  }

  /** Wait until a token is available, then consume one. */
  async acquire(): Promise<void> {
    for (;;) {
      this.refill();
      if (this.tokens > 0) {
        this.tokens -= 1;
        return;
      }

      if (this.now === RateLimiter.defaultNow) {
        const elapsed = this.now() - this.lastRefill;
        const waitMs = Math.max(1, this.rateLimit - elapsed);
        await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      await new Promise<void>((resolve) => {
        this.waiters.push(resolve);
      });
    }
  }

  /** Wake waiters after the clock advances (for testing). */
  notify(): void {
    this.refill();
  }

  /** Refills tokens based on elapsed time and wakes waiting acquirers. */
  private refill(): void {
    const t = this.now();
    const elapsed = t - this.lastRefill;
    if (elapsed >= this.rateLimit) {
      const periods = Math.floor(elapsed / this.rateLimit);
      this.tokens = Math.min(this.rateDelta, this.tokens + periods * this.rateDelta);
      this.lastRefill += periods * this.rateLimit;
      while (this.tokens > 0 && this.waiters.length > 0) {
        this.tokens -= 1;
        const next = this.waiters.shift();
        next?.();
      }
    }
  }
}
