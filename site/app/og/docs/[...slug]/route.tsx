import { getPageImageUrl, source } from "@/lib/source";
import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import { generate as DefaultImage } from "@fumadocs/base-ui/og";
import { appName } from "@/lib/shared";

export const revalidate = false;

const MARK_PATH =
  "M0 101.366L299 0L211.414 300L175.279 281.032L151.933 177.269L242.651 55.8633L121.689 146.914L26.3102 131.706L0 101.366Z";

function SentlyOgMark() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="56"
      height="56"
      viewBox="0 0 299 300"
      fill="none"
    >
      <path d={MARK_PATH} fill="#FFFFFF" />
    </svg>
  );
}

export async function GET(_req: Request, { params }: RouteContext<"/og/docs/[...slug]">) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  return new ImageResponse(
    (
      <DefaultImage
        title={page.data.title}
        description={page.data.description}
        site={appName}
        icon={<SentlyOgMark />}
        primaryColor="rgba(255,255,255,0.22)"
        primaryTextColor="rgb(255,255,255)"
      />
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    lang: page.locale,
    slug: getPageImageUrl(page).segments,
  }));
}
