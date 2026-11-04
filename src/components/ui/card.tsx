import type { ComponentProps } from "react";
import { cn } from "@/lib/format";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("rounded-2xl border border-border/70 bg-card p-4 shadow-card", className)} {...props} />;
}

export function CardHeader({
  title,
  action,
  className,
  id,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 id={id} className="text-body font-semibold text-foreground">
        {title}
      </h2>
      {action}
    </div>
  );
}

export function SectionTitle({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <h2 id={id} className={cn("px-1 pb-2 pt-1 text-caption font-semibold uppercase tracking-wide text-muted-foreground", className)}>
      {children}
    </h2>
  );
}
