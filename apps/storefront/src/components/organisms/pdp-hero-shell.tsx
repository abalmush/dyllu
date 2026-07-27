import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  label: string;
};

export function PdpHeroShell({ children, label }: Props) {
  return (
    <section aria-label={label} className="relative isolate overflow-x-clip">
      <div
        aria-hidden
        className="from-primary via-primary/80 to-foreground absolute inset-0 bg-linear-to-br"
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative z-1 py-8">{children}</div>
    </section>
  );
}
