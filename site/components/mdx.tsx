import defaultMdxComponents from "@fumadocs/base-ui/mdx";
import { Accordion, Accordions as FumaAccordions } from "@fumadocs/base-ui/components/accordion";
import { Callout } from "@fumadocs/base-ui/components/callout";
import { Card } from "@fumadocs/base-ui/components/card";
import { File, Files, Folder } from "@fumadocs/base-ui/components/files";
import { Step, Steps } from "@fumadocs/base-ui/components/steps";
import { Tab, Tabs } from "@fumadocs/base-ui/components/tabs";
import { TypeTable } from "@fumadocs/base-ui/components/type-table";
import type { MDXComponents } from "mdx/types";
import type { ComponentProps, HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Docs card grid — one card fills the row; two or more share columns when
 * there is room. Fumadocs defaults to a hard `grid-cols-2`, which leaves a
 * half-empty gap on every single-card "Next" block.
 */
function Cards({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "@container my-4 grid gap-3",
        "grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))]",
        className,
      )}
    />
  );
}

/**
 * Accordion block with prose-sibling spacing. Bare `div`s get no margin from
 * Tailwind Typography, so troubleshooting stacks flush against Next cards.
 */
function Accordions({ className, ...props }: ComponentProps<typeof FumaAccordions>) {
  return <FumaAccordions {...props} className={cn("my-4", className)} />;
}

/**
 * MDX component map — Fumadocs defaults used across the sently handbook.
 *
 * @param components - Extra overrides from the page renderer
 */
export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Accordion,
    Accordions,
    Callout,
    Card,
    Cards,
    File,
    Files,
    Folder,
    Step,
    Steps,
    Tab,
    Tabs,
    TypeTable,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
