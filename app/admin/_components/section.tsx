import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Section({
  action,
  children,
  className,
  description,
  title,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-semibold text-lg tracking-tight">{title}</h2>
          {description ? (
            <p className="text-muted-foreground text-sm">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
      {children}
    </p>
  );
}

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-max text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children }: { children?: ReactNode }) {
  return (
    <th className="whitespace-nowrap border-b border-border bg-muted/40 px-3 py-2 font-medium text-muted-foreground">
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td className={cn("border-b border-border px-3 py-2 align-top", className)}>
      {children}
    </td>
  );
}
