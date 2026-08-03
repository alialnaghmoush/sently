/**
 * Hero transport route — sender → transport → channel micro-map that sits
 * under the code tour. One packet relays across the two hops in the active
 * channel's ink; the landing pin breathes as the packet arrives. Labels swap
 * with the tour tab (remount restarts the flight — one send per snippet).
 * Reduced motion: packets vanish via the global CSS gate, the pin rests at
 * its `opacity` attribute. Server-safe: all motion is CSS, colors bind via
 * `currentColor` + oke element inks (fill/stroke utilities are not in the
 * Fumadocs preset build).
 */

import type { ReactNode } from "react";

type HeroTransportRouteProps = {
  /** Sender factory from the visible snippet, e.g. `createMailer`. */
  readonly sender: string;
  /** Transport class the snippet constructs, e.g. `ResendTransport`. */
  readonly transport: string;
  /** Channel label, uppercase — e.g. `EMAIL`. */
  readonly channel: string;
  /** Channel ink — CSS variable, drives packet stroke and pin fill. */
  readonly ink: string;
};

/** Seconds per hop; hop B is delayed by exactly one hop so the packet relays. */
const HOP_SECONDS = 1.5;
/** Pin peaks at 50% of its pulse; the packet lands at ~94.5% of hop B. */
const PIN_DELAY_SECONDS = -HOP_SECONDS + HOP_SECONDS * (0.945 - 0.5);

const ROUTE_A = "M 144 25 L 252 25";
const ROUTE_B = "M 412 25 L 530 25";

/**
 * Decorative SVG — hidden from assistive tech; the snippet above it carries
 * the same information (sender factory, transport import, channel).
 */
export function HeroTransportRoute({
  sender,
  transport,
  channel,
  ink,
}: HeroTransportRouteProps): ReactNode {
  return (
    <svg viewBox="0 0 640 60" role="presentation" aria-hidden className="h-auto w-full">
      {/* Base routes */}
      <g fill="none" stroke="currentColor" strokeWidth={1} className="text-fd-muted-foreground/30">
        <path d={ROUTE_A} />
        <path d={ROUTE_B} />
      </g>

      {/* Packet relay — hop B trails hop A by exactly one hop duration */}
      <g fill="none" strokeWidth={1.75} strokeLinecap="round">
        <path
          d={ROUTE_A}
          pathLength={1}
          stroke={ink}
          strokeDasharray="0.055 0.945"
          className="sently-packet-flow"
          style={{ animationDuration: `${HOP_SECONDS}s` }}
        />
        <path
          d={ROUTE_B}
          pathLength={1}
          stroke={ink}
          strokeDasharray="0.055 0.945"
          className="sently-packet-flow"
          style={{
            animationDuration: `${HOP_SECONDS}s`,
            animationDelay: `${-HOP_SECONDS}s`,
          }}
        />
      </g>

      {/* Sender node — the app code */}
      <g className="text-fd-foreground/70">
        <rect x={8} y={14} width={136} height={22} rx={6} fill="none" stroke="currentColor" />
        <text
          x={76}
          y={25}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={9.5}
          fill="currentColor"
          className="font-mono"
        >
          {sender}
        </text>
      </g>

      {/* Transport node — the swappable provider */}
      <g className="text-fd-muted-foreground">
        <rect x={252} y={14} width={160} height={22} rx={6} fill="none" stroke="currentColor" />
        <text
          x={332}
          y={25}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={9.5}
          fill="currentColor"
          className="font-mono"
        >
          {transport}
        </text>
      </g>

      {/* Channel node + landing pin */}
      <g>
        <rect
          x={530}
          y={14}
          width={102}
          height={22}
          rx={6}
          fill="none"
          stroke="currentColor"
          className="text-fd-muted-foreground/40"
        />
        <text
          x={581}
          y={25}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={8}
          fill="currentColor"
          className="font-mono text-fd-muted-foreground"
          style={{ letterSpacing: 1.4 }}
        >
          {channel}
        </text>
        <circle
          cx={522}
          cy={25}
          r={2.5}
          fill={ink}
          opacity={0.35}
          className="sently-node-pulse"
          style={{
            animationDuration: `${HOP_SECONDS}s`,
            animationDelay: `${PIN_DELAY_SECONDS}s`,
          }}
        />
      </g>

      {/* Model captions */}
      <g
        fill="currentColor"
        fontSize={7}
        className="font-mono text-fd-muted-foreground/60"
        style={{ letterSpacing: 1.6 }}
      >
        <text x={76} y={54} textAnchor="middle">
          SENDER
        </text>
        <text x={332} y={54} textAnchor="middle">
          TRANSPORT
        </text>
        <text x={581} y={54} textAnchor="middle">
          CHANNEL
        </text>
      </g>
    </svg>
  );
}
