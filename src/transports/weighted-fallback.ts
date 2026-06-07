/**
 * @module
 * WeightedFallbackTransport — routes each send through a weighted-random
 * primary provider, then fails over through the remaining providers on error.
 * Useful for gradual traffic shifting, migrations, and A/B testing providers.
 *
 * @example
 * ```ts
 * import { WeightedFallbackTransport } from "sently/transports/weighted-fallback";
 * import { ResendTransport } from "sently/transports/resend";
 * import { SESTransport } from "sently/transports/ses";
 *
 * const transport = new WeightedFallbackTransport(
 *   [
 *     { transport: new ResendTransport({ apiKey }), weight: 80 },
 *     { transport: new SESTransport({ accessKeyId, secretAccessKey }), weight: 20 },
 *   ],
 *   { cooldownMs: 300_000 },
 * );
 * ```
 */
import type { MailOptions, SendResult, Transport, VerifyResult } from "../core/types.js";
import {
  type FallbackOptions,
  FallbackTransport,
  type FallbackVerifyAllResult,
} from "./fallback.js";

/** A transport entry with a relative routing weight. */
export interface WeightedTransportEntry {
  /** Transport instance. */
  transport: Transport;
  /** Relative weight (e.g. 80 vs 20 → ~80% of sends try this provider first). */
  weight: number;
}

type MailerOnFallback = Parameters<FallbackTransport["setMailerOnFallback"]>[0];

/**
 * Weighted provider routing with failover on error.
 */
export class WeightedFallbackTransport implements Transport {
  readonly provider = "weighted-fallback";

  private readonly entries: WeightedTransportEntry[];
  private readonly fallbackOptions: FallbackOptions;
  private readonly random: () => number;
  private readonly inner: FallbackTransport;
  private mailerOnFallback: MailerOnFallback | undefined;

  /**
   * Creates a weighted fallback transport.
   * @throws {Error} When entries is empty or total weight is zero.
   */
  constructor(
    entries: WeightedTransportEntry[],
    options?: FallbackOptions & { random?: () => number },
  ) {
    if (entries.length === 0) {
      throw new Error("WeightedFallbackTransport requires at least one entry");
    }

    const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
    if (totalWeight <= 0) {
      throw new Error("WeightedFallbackTransport requires positive total weight");
    }

    this.entries = entries;
    this.random = options?.random ?? Math.random;

    const cooldownState = new Map<string, number>();
    const { random: _random, ...rest } = options ?? {};
    this.fallbackOptions = { ...rest, cooldownState };

    this.inner = new FallbackTransport(
      entries.map((entry) => entry.transport),
      this.fallbackOptions,
    );
  }

  /**
   * Register a per-send onFallback callback from mailer lifecycle hooks.
   * @internal Used by {@link MailerImpl}; cleared after each send.
   */
  setMailerOnFallback(callback: MailerOnFallback | undefined): void {
    this.mailerOnFallback = callback;
  }

  private buildOrder(): Transport[] {
    const primaryIndex = this.pickWeightedIndex();
    const order: Transport[] = [this.entries[primaryIndex]?.transport as Transport];

    const remaining = this.entries
      .map((entry, index) => ({ entry, index }))
      .filter(({ index }) => index !== primaryIndex)
      .sort((a, b) => b.entry.weight - a.entry.weight);

    for (const { entry } of remaining) {
      order.push(entry.transport);
    }

    return order;
  }

  private pickWeightedIndex(): number {
    const total = this.entries.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = this.random() * total;

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i] as WeightedTransportEntry;
      roll -= entry.weight;
      if (roll <= 0) {
        return i;
      }
    }

    return this.entries.length - 1;
  }

  /** Sends via a weighted-random primary provider, failing over on error. */
  async send(message: MailOptions): Promise<SendResult> {
    const transport = new FallbackTransport(this.buildOrder(), this.fallbackOptions);
    if (this.mailerOnFallback !== undefined) {
      transport.setMailerOnFallback(this.mailerOnFallback);
    }
    return transport.send(message);
  }

  /** Returns the first healthy provider in the chain. */
  async verify(): Promise<VerifyResult> {
    return this.inner.verify();
  }

  /** Verifies every weighted provider in definition order. */
  async verifyAll(): Promise<FallbackVerifyAllResult> {
    return this.inner.verifyAll();
  }

  /** Closes every underlying transport. */
  async close(): Promise<void> {
    await this.inner.close();
  }
}
