/**
 * Stack compare — the "typical stack vs sently" story as a wiring diagram
 * instead of a table. Left: app code tangled into per-vendor SDKs, each with
 * its own dash pattern (own auth, own retries, own errors) and stuttering
 * packets. Right: one sender layer fanning cleanly into transports with one
 * error shape. Server-safe SVG; all motion is CSS (see global.css), reduced
 * motion keeps the static diagram.
 */

import type { ReactNode } from "react";

/** Left panel — vendor SDKs each wired their own way into app code. */
const VENDOR_ROWS = [
  { label: "resend sdk", y: 96, dash: "2 4", skew: -80, cross: 70, delay: 0 },
  { label: "twilio sdk", y: 158, dash: "6 3", skew: 70, cross: -75, delay: -0.9 },
  { label: "meta sdk", y: 220, dash: "1 3", skew: -60, cross: 80, delay: -1.7 },
  { label: "web-push lib", y: 282, dash: "4 4 2 4", skew: 85, cross: -65, delay: -2.4 },
] as const;

/** Right panel — transports hanging off the single sender layer. */
const TRANSPORT_CHIPS = [
  { label: "Resend", cx: 127, delay: 0 },
  { label: "Twilio", cx: 227, delay: -0.75 },
  { label: "WA Cloud", cx: 327, delay: -1.5 },
  { label: "FCM", cx: 427, delay: -2.25 },
] as const;

function TangledPanel(): ReactNode {
  return (
    <svg viewBox="0 0 560 330" role="presentation" aria-hidden className="h-auto w-full">
      {/* tangled routes — every vendor its own pattern, crossing paths */}
      <g fill="none" strokeWidth={1}>
        {VENDOR_ROWS.map((row) => (
          <path
            key={row.label}
            d={`M 280 48 C ${280 + row.skew} 74, ${280 + row.cross} ${row.y - 34}, 280 ${row.y}`}
            stroke="currentColor"
            strokeDasharray={row.dash}
            className="text-fd-muted-foreground/35"
          />
        ))}
      </g>

      {/* stuttering packets — steps() makes the crawl feel lossy */}
      <g fill="none" strokeWidth={1.75} strokeLinecap="round">
        {VENDOR_ROWS.map((row) => (
          <path
            key={row.label}
            d={`M 280 48 C ${280 + row.skew} 74, ${280 + row.cross} ${row.y - 34}, 280 ${row.y}`}
            pathLength={1}
            stroke="var(--oke-el-ai)"
            strokeDasharray="0.05 0.95"
            className="sently-packet-flow"
            style={{
              animationDuration: "3.4s",
              animationDelay: `${row.delay}s`,
              animationTimingFunction: "steps(7, end)",
            }}
          />
        ))}
      </g>

      {/* per-route failure ticks — a different shape per vendor, always lit */}
      {VENDOR_ROWS.map((row, i) => (
        <g
          key={row.label}
          stroke="var(--oke-el-ai)"
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.35}
          className="sently-node-pulse"
          style={{ animationDelay: `${i * 0.6}s` }}
        >
          <path d={`M ${280 + row.skew * 0.55 - 4} ${row.y - 22} l 8 8 m 0 -8 l -8 8`} />
        </g>
      ))}

      {/* app node */}
      <g className="text-fd-foreground/70">
        <rect x={195} y={18} width={170} height={30} rx={6} fill="none" stroke="currentColor" />
        <text
          x={280}
          y={33}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={10.5}
          fill="currentColor"
          className="font-mono"
        >
          your app
        </text>
      </g>

      {/* vendor nodes */}
      {VENDOR_ROWS.map((row) => (
        <g key={row.label}>
          <rect
            x={185}
            y={row.y}
            width={190}
            height={26}
            rx={5}
            fill="none"
            stroke="currentColor"
            className="text-fd-muted-foreground/40"
          />
          <text
            x={280}
            y={row.y + 13}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={9}
            fill="currentColor"
            className="font-mono text-fd-muted-foreground"
            style={{ letterSpacing: 1.2 }}
          >
            {row.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function UnifiedPanel(): ReactNode {
  return (
    <svg viewBox="0 0 560 330" role="presentation" aria-hidden className="h-auto w-full">
      {/* uniform routes — one pattern for every channel */}
      <g fill="none" stroke="currentColor" strokeWidth={1} className="text-fd-muted-foreground/30">
        <path d="M 280 48 L 280 96" />
        {TRANSPORT_CHIPS.map((chip) => (
          <path key={chip.label} d={`M 280 126 C 280 168, ${chip.cx} 178, ${chip.cx} 220`} />
        ))}
      </g>

      {/* smooth packets — same speed, same shape, every route */}
      <g fill="none" strokeWidth={1.75} strokeLinecap="round">
        <path
          d="M 280 48 L 280 96"
          pathLength={1}
          stroke="var(--oke-el-flow)"
          strokeDasharray="0.12 0.88"
          className="sently-packet-flow"
          style={{ animationDuration: "1.4s" }}
        />
        {TRANSPORT_CHIPS.map((chip) => (
          <path
            key={chip.label}
            d={`M 280 126 C 280 168, ${chip.cx} 178, ${chip.cx} 220`}
            pathLength={1}
            stroke="var(--oke-el-gate)"
            strokeDasharray="0.08 0.92"
            className="sently-packet-flow"
            style={{ animationDuration: "2.6s", animationDelay: `${chip.delay}s` }}
          />
        ))}
      </g>

      {/* app node */}
      <g className="text-fd-foreground/70">
        <rect x={195} y={18} width={170} height={30} rx={6} fill="none" stroke="currentColor" />
        <text
          x={280}
          y={33}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={10.5}
          fill="currentColor"
          className="font-mono"
        >
          your app
        </text>
      </g>

      {/* the single sender layer */}
      <g className="text-fd-foreground/70">
        <rect
          x={130}
          y={96}
          width={300}
          height={30}
          rx={6}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.25}
        />
        <text
          x={280}
          y={111}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={10}
          fill="currentColor"
          className="font-mono"
          style={{ letterSpacing: 1 }}
        >
          sently channel senders
        </text>
      </g>

      {/* transports */}
      {TRANSPORT_CHIPS.map((chip) => (
        <g key={chip.label}>
          <rect
            x={chip.cx - 44}
            y={220}
            width={88}
            height={26}
            rx={5}
            fill="none"
            stroke="currentColor"
            className="text-fd-muted-foreground/40"
          />
          <text
            x={chip.cx}
            y={233}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={9}
            fill="currentColor"
            className="font-mono text-fd-muted-foreground"
            style={{ letterSpacing: 1 }}
          >
            {chip.label}
          </text>
          <circle
            cx={chip.cx}
            cy={220}
            r={2.5}
            fill="var(--oke-el-gate)"
            opacity={0.35}
            className="sently-node-pulse"
            style={{ animationDuration: "2.6s", animationDelay: `${chip.delay + 1.15}s` }}
          />
        </g>
      ))}

      {/* one error shape for every failure */}
      <g>
        <rect
          x={165}
          y={272}
          width={230}
          height={24}
          rx={12}
          fill="none"
          stroke="currentColor"
          className="text-fd-muted-foreground/40"
        />
        <text
          x={280}
          y={284}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={9}
          fill="currentColor"
          className="font-mono text-fd-muted-foreground"
          style={{ letterSpacing: 1 }}
        >
          SentlyError · one failure shape
        </text>
      </g>
    </svg>
  );
}

/**
 * Two framed panels with mono captions; contrast is the message.
 */
export function StackCompare(): ReactNode {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <figure className="m-0 flex flex-col overflow-hidden rounded-xl border border-fd-border bg-fd-card">
        <figcaption className="flex items-center gap-2 border-b border-fd-border px-5 py-3">
          <span aria-hidden className="size-1 rounded-full bg-[var(--oke-el-ai)]" />
          <span className="font-mono text-[11px] tracking-[0.16em] text-fd-muted-foreground uppercase">
            Typical stack — an SDK per channel
          </span>
        </figcaption>
        <div className="px-3 py-4 sm:px-5">
          <TangledPanel />
        </div>
        <p className="border-t border-fd-border px-5 py-2.5 text-[11px] text-fd-muted-foreground">
          Every vendor ships its own auth, retries, and error strings into your codebase.
        </p>
      </figure>

      <figure className="m-0 flex flex-col overflow-hidden rounded-xl border border-fd-border bg-fd-card">
        <figcaption className="flex items-center gap-2 border-b border-fd-border px-5 py-3">
          <span
            aria-hidden
            className="sently-dot-pulse size-1 rounded-full bg-[var(--oke-el-gate)]"
          />
          <span className="font-mono text-[11px] tracking-[0.16em] text-fd-muted-foreground uppercase">
            With sently — one sender layer
          </span>
        </figcaption>
        <div className="px-3 py-4 sm:px-5">
          <UnifiedPanel />
        </div>
        <p className="border-t border-fd-border px-5 py-2.5 text-[11px] text-fd-muted-foreground">
          Senders own the contract; transports plug in underneath. Failures arrive as one shape.
        </p>
      </figure>
    </div>
  );
}
