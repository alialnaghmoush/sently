import type { SVGProps } from "react";
import { cn } from "@/lib/cn";

/** Shared props for Mailpit brand SVGs. */
export type MailpitLogoProps = SVGProps<SVGSVGElement> & {
/**
 * `brand` — slate body + Mailpit green (body lightens in dark mode).
 * `muted` — `currentColor` (marquee / sidebar strip language).
 */
  readonly tone?: "brand" | "muted";
};

/**
 * Mailpit mark (envelope + teal wing), from `site/public/transports/mailpit.svg`.
 * Sized for the shared icon gutter (`size-4`) next to a text label.
 */
export function MailpitLogoIcon({
  className,
  tone = "brand",
  ...props
}: MailpitLogoProps) {
  const muted = tone === "muted";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 132.292 121.708"
      fill="none"
      role="img"
      aria-label="Mailpit"
      className={cn("block size-4 shrink-0", className)}
      {...props}
    >
      <path
        d="M12.321 0l53.861 53.918L120.365 0zM5.155 9.025l60.842 59.673 61.211-59.489-.185 36.835L66.921 70.54l15.164 12.616-8.137 5.986-41.609.184c-4.838-.022-25.877-18.34-27.185-41.255z"
        fill={muted ? "currentColor" : "#2d4a5f"}
        className={muted ? undefined : "dark:fill-white"}
      />
      <path
        d="M78.385 72.049l53.907-21.679-8.031 57.318-11.845-9.132c-21.727 23.171-45.255 26.289-67.997 20.837S12.281 98.39 5.155 83.8-.67 53.116 2.843 38.769c1.13 10.511-1.313 16.316 6.38 33.612 6.31 11.399 14.413 20.417 25.89 24.956 13.9 6.195 32.247 3.357 41.701-3.039l14.24-12.156z"
        fill={muted ? "currentColor" : "#00b786"}
      />
    </svg>
  );
}

/**
 * Mailpit mark at wordmark scale (docs title badge / larger slots).
 */
export function MailpitLogo({
  className,
  tone = "brand",
  ...props
}: MailpitLogoProps) {
  return (
    <MailpitLogoIcon
      tone={tone}
      className={cn("size-auto h-7 w-auto", className)}
      {...props}
    />
  );
}
