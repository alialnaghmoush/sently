import type { SVGProps } from "react";
import { cn } from "@/lib/cn";

/** Shared props for Web Push mark SVGs. */
export type WebPushLogoProps = SVGProps<SVGSVGElement> & {
  /**
   * `brand` — blue notification tile + sky badge.
   * `muted` — `currentColor` (marquee / sidebar strip language).
   */
  readonly tone?: "brand" | "muted";
};

/**
 * Web Push mark (notification tile + bell + badge), from
 * `site/public/transports/webpush.svg`.
 * Sized for the shared icon gutter (`size-4`) next to a text label.
 */
export function WebPushLogoIcon({
  className,
  tone = "brand",
  ...props
}: WebPushLogoProps) {
  const muted = tone === "muted";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label="Web Push"
      className={cn("block size-4 shrink-0", className)}
      {...props}
    >
      <rect
        x="1.5"
        y="1.5"
        width="21"
        height="21"
        rx="5.5"
        fill={muted ? "currentColor" : "#2563EB"}
        opacity={muted ? 0.22 : undefined}
      />
      <path
        d="M8.25 10.1a3.75 3.75 0 0 1 7.5 0c0 2.85 1.1 3.9 1.1 3.9H7.15s1.1-1.05 1.1-3.9Z"
        fill={muted ? "currentColor" : "#fff"}
      />
      <path
        d="M10.4 17.1a1.6 1.6 0 0 0 3.2 0"
        stroke={muted ? "currentColor" : "#fff"}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="17.6"
        cy="7.1"
        r="2.15"
        fill={muted ? "currentColor" : "#38BDF8"}
      />
    </svg>
  );
}

/**
 * Web Push mark at wordmark scale (docs title badge / larger slots).
 */
export function WebPushLogo({
  className,
  tone = "brand",
  ...props
}: WebPushLogoProps) {
  return (
    <WebPushLogoIcon
      tone={tone}
      className={cn("size-auto h-7 w-auto", className)}
      {...props}
    />
  );
}
