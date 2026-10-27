import type { ReactNode } from "react";

export function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-b border-border pb-6 last:border-b-0">
      <h2 className="text-[15px] leading-[22px] font-bold">{title}</h2>
      {children}
    </section>
  );
}

export const fieldClass =
  "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
