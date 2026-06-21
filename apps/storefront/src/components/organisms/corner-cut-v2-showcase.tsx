import * as React from "react";

import { cn } from "@lib/utils";

import { Container } from "@/components/atoms/container";

type Silhouette = {
  className: string;
  label: string;
  intent: string;
};

const SILHOUETTES: Silhouette[] = [
  {
    className: "cc-v2-bracket",
    label: "Bracket",
    intent:
      "Asymmetric — mounting hardware feel. Big TL diagonal + small TR notch.",
  },
  {
    className: "cc-v2-module",
    label: "Module",
    intent: "Service-port panel. TL+BR diagonals plus a TR step notch.",
  },
  {
    className: "cc-v2-chassis",
    label: "Chassis",
    intent: "Connector housing — all 4 corners, asymmetric cut sizes.",
  },
];

function Tile({
  silhouette,
  surface,
  body,
  tone,
}: {
  silhouette: string;
  surface: "matte" | "plastic" | "none";
  body: React.ReactNode;
  tone: "light" | "dark" | "primary";
}) {
  const surfaceClass =
    surface === "matte"
      ? "cc-v2-surface-matte"
      : surface === "plastic"
        ? "cc-v2-surface-plastic"
        : "";
  const toneClass =
    tone === "light"
      ? "bg-surface-strong text-foreground"
      : tone === "dark"
        ? "bg-foreground text-background"
        : "bg-primary text-primary-foreground";
  return (
    <button
      type="button"
      className={cn(
        silhouette,
        "cc-v2-depth",
        surfaceClass,
        toneClass,
        "relative flex min-h-[160px] w-full flex-col justify-between p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
    >
      {body}
    </button>
  );
}

function TileBody({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <>
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] opacity-70">
        {eyebrow}
      </span>
      <div className="flex flex-col gap-1">
        <span className="font-display text-lg font-extrabold leading-tight tracking-tight">
          {title}
        </span>
        <span className="text-xs opacity-75">{subtitle}</span>
      </div>
    </>
  );
}

function SilhouetteRow({ silhouette }: { silhouette: Silhouette }) {
  return (
    <div className="grid gap-3 small:grid-cols-3">
      <Tile
        silhouette={silhouette.className}
        surface="none"
        tone="light"
        body={
          <TileBody
            eyebrow={`${silhouette.label} · flat`}
            title="DYLLU 20V Pro"
            subtitle="Hover / press pentru mișcarea mecanică."
          />
        }
      />
      <Tile
        silhouette={silhouette.className}
        surface="plastic"
        tone="dark"
        body={
          <TileBody
            eyebrow={`${silhouette.label} · plastic`}
            title="Brushless Motor"
            subtitle="Gradient sheen, fără grain — finisaj rășini."
          />
        }
      />
      <Tile
        silhouette={silhouette.className}
        surface="matte"
        tone="primary"
        body={
          <TileBody
            eyebrow={`${silhouette.label} · matte`}
            title="Pro Series"
            subtitle="Sheen + micrograin — finisaj metal mat."
          />
        }
      />
    </div>
  );
}

function V1Comparison() {
  return (
    <div className="grid gap-3 small:grid-cols-3">
      <div className="clip-corner-cut-md clip-shadow-md flex min-h-[160px] flex-col justify-between bg-surface-strong p-5 text-foreground">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] opacity-70">
          V1 · clip-corner-cut-md
        </span>
        <div className="flex flex-col gap-1">
          <span className="font-display text-lg font-extrabold leading-tight tracking-tight">
            Simetric, fără surface
          </span>
          <span className="text-xs opacity-75">
            TL + BR egale, fără hover, fără strat.
          </span>
        </div>
      </div>
      <div className="clip-corner-cut-md clip-shadow-md flex min-h-[160px] flex-col justify-between bg-foreground p-5 text-background">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] opacity-70">
          V1 · dark
        </span>
        <div className="flex flex-col gap-1">
          <span className="font-display text-lg font-extrabold leading-tight tracking-tight">
            Brushless Motor
          </span>
          <span className="text-xs opacity-75">Plat, fără interacțiune.</span>
        </div>
      </div>
      <div className="clip-corner-cut-md clip-shadow-md flex min-h-[160px] flex-col justify-between bg-primary p-5 text-primary-foreground">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] opacity-70">
          V1 · primary
        </span>
        <div className="flex flex-col gap-1">
          <span className="font-display text-lg font-extrabold leading-tight tracking-tight">
            Pro Series
          </span>
          <span className="text-xs opacity-75">Singura sursă de adâncime.</span>
        </div>
      </div>
    </div>
  );
}

function SizeRow() {
  return (
    <div className="grid gap-3 small:grid-cols-3">
      {[
        { scale: "scale-[0.72]", label: "sm (-28%)" },
        { scale: "", label: "md (default)" },
        { scale: "scale-[1.18]", label: "lg (+18%)" },
      ].map((s) => (
        <div
          key={s.label}
          className="flex items-center justify-center bg-surface-subtle/40 p-6"
        >
          <div className={cn("w-full", s.scale)}>
            <Tile
              silhouette="cc-v2-module"
              surface="matte"
              tone="dark"
              body={
                <TileBody
                  eyebrow={`Module · ${s.label}`}
                  title="Modular industrial"
                  subtitle="Same silhouette, scaled."
                />
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionTitle({
  index,
  title,
  intent,
}: {
  index: string;
  title: string;
  intent: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {index}
      </span>
      <h3 className="font-display text-xl font-extrabold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="max-w-2xl text-sm text-muted-foreground">{intent}</p>
    </div>
  );
}

export function CornerCutV2Showcase() {
  return (
    <section className="bg-surface-subtle/40 py-16 small:py-20">
      <Container className="flex flex-col gap-12">
        <header className="flex flex-col gap-3">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
            Design system · V2
          </span>
          <h2 className="font-display text-display-sm font-extrabold tracking-tight text-foreground">
            Corner-cut V2 — modular industrial
          </h2>
          <p className="max-w-2xl text-base text-muted-foreground">
            Three engineered silhouettes — <strong>Bracket</strong>,{" "}
            <strong>Module</strong>, <strong>Chassis</strong> — paired with
            matte/plastic surface overlays, layered drop-shadows for stacked
            panel depth, and a mechanical hover/press transform. Hover the tiles
            to see the lift; click to feel the press.
          </p>
        </header>

        {SILHOUETTES.map((s, i) => (
          <div key={s.className} className="flex flex-col gap-4">
            <SectionTitle
              index={`0${i + 1}`}
              title={s.label}
              intent={s.intent}
            />
            <SilhouetteRow silhouette={s} />
          </div>
        ))}

        <div className="flex flex-col gap-4">
          <SectionTitle
            index="04"
            title="Sizing"
            intent="The same silhouette at three scales. Use CSS transform: scale on a wrapper, or pair with size-modified clip-path classes if rolled out."
          />
          <SizeRow />
        </div>

        <div className="flex flex-col gap-4">
          <SectionTitle
            index="05"
            title="V1 baseline"
            intent="The current clip-corner-cut-md + clip-shadow-md, for comparison."
          />
          <V1Comparison />
        </div>

        <div className="grid gap-3 rounded-md border border-border bg-background p-5 text-xs text-muted-foreground small:grid-cols-2">
          <div>
            <span className="font-mono font-semibold uppercase tracking-[0.18em] text-foreground">
              Class kit
            </span>
            <ul className="mt-2 flex flex-col gap-1">
              <li>
                <code>cc-v2-bracket</code> · <code>cc-v2-module</code> ·{" "}
                <code>cc-v2-chassis</code>
              </li>
              <li>
                <code>cc-v2-depth</code> — layered shadow + hover/press
              </li>
              <li>
                <code>cc-v2-surface-matte</code> ·{" "}
                <code>cc-v2-surface-plastic</code>
              </li>
            </ul>
          </div>
          <div>
            <span className="font-mono font-semibold uppercase tracking-[0.18em] text-foreground">
              Usage
            </span>
            <p className="mt-2">
              Pair one silhouette + <code>cc-v2-depth</code> + an optional
              surface on a single element. The host sets the bg-color; surface
              overlays compose via <code>background-blend-mode</code>.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
