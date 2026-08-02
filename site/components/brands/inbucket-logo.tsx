import type { SVGProps } from "react";
import { cn } from "@/lib/cn";

/** Shared props for Inbucket brand SVGs. */
export type InbucketLogoProps = SVGProps<SVGSVGElement> & {
  /**
   * `brand` — teal bucket + envelope.
   * `muted` — `currentColor` (marquee / sidebar strip language).
   */
  readonly tone?: "brand" | "muted";
};

/**
 * Inbucket mark (envelope dropping into a bucket), from
 * `site/public/transports/inbucket.svg`.
 * Sized for the shared icon gutter (`size-4`) next to a text label.
 */
export function InbucketLogoIcon({
  className,
  tone = "brand",
  ...props
}: InbucketLogoProps) {
  const muted = tone === "muted";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Inbucket"
      className={cn("block size-4 shrink-0", className)}
      {...props}
    >
      <path
        d="M10 18 L32 34 L54 18"
        stroke={muted ? "currentColor" : "#0f766e"}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={muted ? undefined : "dark:stroke-teal-300"}
      />
      <path
        d="M12 20 H52 V36 C52 36 44 44 32 44 C20 44 12 36 12 36 Z"
        fill={muted ? "currentColor" : "#0f766e"}
        className={muted ? undefined : "dark:fill-teal-300"}
      />
      <ellipse
        cx="32"
        cy="40"
        rx="18"
        ry="5"
        fill={muted ? "currentColor" : "#14b8a6"}
      />
      <path
        d="M14 40 L18 58 C18 58 24 62 32 62 C40 62 46 58 46 58 L50 40 Z"
        fill={muted ? "currentColor" : "#14b8a6"}
      />
      {!muted && (
        <path
          d="M22 44 L24 56"
          stroke="#99f6e4"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.7"
        />
      )}
    </svg>
  );
}

/**
 * Inbucket mark at wordmark scale (docs title badge / larger slots).
 */
export function InbucketLogo({
  className,
  tone = "brand",
  ...props
}: InbucketLogoProps) {
  return (
    <InbucketLogoIcon
      tone={tone}
      className={cn("size-auto h-7 w-auto", className)}
      {...props}
    />
  );
}
