import type { ReactNode } from "react";

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-1.5 text-body font-semibold">{title}</h2>
      <p className="text-body leading-relaxed text-muted-foreground">{children}</p>
    </section>
  );
}
