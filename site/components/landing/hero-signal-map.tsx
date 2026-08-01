/**
 * Hero signal map — sender fan-out vector that lives under the hero copy.
 * One `send()` node, four channel nodes, packet dots riding each route on a
 * CSS dash-trace (`.sently-packet-flow` in global.css). Channel pins breathe
 * in sync with packet arrival. Reduced motion hides the packets and pulses,
 * leaving the static map. Server-safe: all motion is CSS, colors come from
 * `currentColor` + the oke element inks (fill/stroke utilities are not in
 * the Fumadocs preset build, so colors bind via presentation attributes).
 */

import type { ReactNode } from "react";

type Route = {
  readonly id: string;
  readonly label: string;
  /** Channel ink — CSS variable, drives packet stroke and pin fill. */
  readonly ink: string;
  /** Channel node centerline within the 520×120 viewBox. */
  readonly y: number;
  /** Packet delay in seconds; negative so routes are mid-flight on load. */
  readonly delay: number;
};

const ROUTES: ReadonlyArray<Route> = [
  { id: "email", label: "EMAIL", ink: "var(--oke-el-flow)", y: 16, delay: 0 },
  { id: "sms", label: "SMS", ink: "var(--oke-el-signal)", y: 46, delay: -0.75 },
  { id: "whatsapp", label: "WHATSAPP", ink: "var(--oke-el-gate)", y: 76, delay: -1.5 },
  { id: "push", label: "PUSH", ink: "var(--oke-el-channel)", y: 106, delay: -2.25 },
];

const PACKET_SECONDS = 3;
/** Packet needs ~94.5% of its loop to reach the pin; the pulse peaks at 50%. */
const PIN_SYNC_SECONDS = PACKET_SECONDS * 0.945 - PACKET_SECONDS * 0.5;

function routePath(y: number): string {
  return `M 74 60 C 190 60, 255 ${y}, 428 ${y}`;
}

/**
 * Decorative SVG — hidden from assistive tech; the copy beside it carries
 * the same information (channels, sender model).
 */
export function HeroSignalMap(): ReactNode {
  return (
    <svg
      viewBox="0 0 520 120"
      role="presentation"
      aria-hidden
      className="h-auto w-full"
    >
      {/* Base routes */}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        className="text-fd-muted-foreground/30"
      >
        {ROUTES.map((route) => (
          <path key={route.id} d={routePath(route.y)} />
        ))}
      </g>

      {/* Packet dots */}
      <g fill="none" strokeWidth={1.75} strokeLinecap="round">
        {ROUTES.map((route) => (
          <path
            key={route.id}
            d={routePath(route.y)}
            pathLength={1}
            stroke={route.ink}
            strokeDasharray="0.055 0.945"
            className="sently-packet-flow"
            style={{
              animationDuration: `${PACKET_SECONDS}s`,
              animationDelay: `${route.delay}s`,
            }}
          />
        ))}
      </g>

      {/* Sender node */}
      <g className="text-fd-foreground/70">
        <rect x={10} y={45} width={64} height={30} rx={6} fill="none" stroke="currentColor" />
        <text
          x={42}
          y={60}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={10.5}
          fill="currentColor"
          className="font-mono"
        >
          send()
        </text>
      </g>

      {/* Channel nodes + landing pins */}
      {ROUTES.map((route) => (
        <g key={route.id}>
          <rect
            x={428}
            y={route.y - 10}
            width={84}
            height={20}
            rx={5}
            fill="none"
            stroke="currentColor"
            className="text-fd-muted-foreground/40"
          />
          <text
            x={470}
            y={route.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={8}
            fill="currentColor"
            className="font-mono text-fd-muted-foreground"
            style={{ letterSpacing: 1.4 }}
          >
            {route.label}
          </text>
          <circle
            cx={420}
            cy={route.y}
            r={2.5}
            fill={route.ink}
            opacity={0.35}
            className="sently-node-pulse"
            style={{
              animationDuration: `${PACKET_SECONDS}s`,
              animationDelay: `${route.delay + PIN_SYNC_SECONDS}s`,
            }}
          />
        </g>
      ))}
    </svg>
  );
}
