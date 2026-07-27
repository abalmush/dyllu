import * as React from "react";
import { ArrowUp, Sparkles } from "lucide-react";

import { cn } from "@lib/utils";

type ChatTurn = { role: "user" | "assistant"; text: string };

const SUGGESTIONS = [
  "Pot construi un gard?",
  "Acumulatorul e compatibil?",
  "Pot economisi?",
  "Taie beton?",
];

const CONVERSATION: ChatTurn[] = [
  { role: "user", text: "Îmi ajunge un singur acumulator pentru un deck?" },
  {
    role: "assistant",
    text: "Pentru un deck de ~12 m² vei face aproximativ 860 de înșurubări. Un acumulator de 5.0Ah acoperă ~60%. Îți recomand 2 acumulatori sau unul + încărcător rapid.",
  },
];

export function CheckoutCopilot() {
  return (
    <div className="clip-corner-cut-lg bg-card ring-border mx-auto flex max-w-[560px] flex-col ring-1">
      <div className="border-border flex items-center gap-2 border-b p-4">
        <span className="bg-primary/10 text-primary grid size-8 place-items-center rounded-full">
          <Sparkles className="size-4" />
        </span>
        <div>
          <p className="text-foreground text-sm font-bold">Copilot DYLLU</p>
          <p className="text-success text-xs">Online · răspunde imediat</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {CONVERSATION.map((turn, i) => (
          <div
            key={i}
            className={cn(
              "flex",
              turn.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <p
              className={cn(
                "clip-corner-cut-sm max-w-[85%] px-3.5 py-2.5 text-sm",
                turn.role === "user"
                  ? "bg-foreground text-background"
                  : "bg-muted text-foreground"
              )}
            >
              {turn.text}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 px-4">
        {SUGGESTIONS.map((suggestion) => (
          <span
            key={suggestion}
            className="clip-corner-cut-xs border-border text-foreground border px-4 py-1.5 text-xs font-medium"
          >
            {suggestion}
          </span>
        ))}
      </div>

      <div className="border-border bg-background m-4 flex items-center gap-2 rounded-full border px-4 py-2">
        <span className="text-muted-foreground flex-1 text-sm">
          Întreabă orice despre proiectul tău…
        </span>
        <span className="bg-foreground text-background grid size-8 place-items-center rounded-full">
          <ArrowUp className="size-4" />
        </span>
      </div>
    </div>
  );
}
