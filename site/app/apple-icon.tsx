import { ImageResponse } from "next/og";

/** Required for `output: "export"` — prerender the PNG at build time. */
export const dynamic = "force-static";
export const revalidate = false;

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const MARK_PATH =
  "M0 101.366L299 0L211.414 300L175.279 281.032L151.933 177.269L242.651 55.8633L121.689 146.914L26.3102 131.706L0 101.366Z";

/**
 * Apple touch icon — brand mark inset in a rounded dark box.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#0D0D0D",
        }}
      >
        <svg
          width="118"
          height="118"
          viewBox="0 0 299 300"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d={MARK_PATH} fill="#FFFFFF" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
