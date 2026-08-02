import { CircleCheck } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Distinctive green badge for transports proven against a real provider API.
 */
export function LiveVerified({
  children,
  title = "Live verified",
  className,
}: {
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "my-4 flex gap-3 rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3 ps-3 text-sm shadow-sm",
        "ring-1 ring-emerald-500/15 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:ring-emerald-400/10",
        className,
      )}
      aria-label={title}
    >
      <span
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300"
        aria-hidden
      >
        <CircleCheck className="size-5 fill-emerald-500/20" strokeWidth={2.25} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="my-0! font-semibold tracking-tight text-emerald-800 dark:text-emerald-200">
          {title}
        </p>
        <div className="text-emerald-900/75 prose-no-margin dark:text-emerald-100/70">{children}</div>
      </div>
    </aside>
  );
}
