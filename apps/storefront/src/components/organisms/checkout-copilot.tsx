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
    <div className="clip-corner-cut-lg mx-auto flex max-w-[560px] flex-col bg-card ring-1 ring-border">
      <div className="flex items-center gap-2 border-b border-border p-4">
        <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="size-4" />
        </span>
        <div>
          <p className="text-sm font-bold text-foreground">Copilot DYLLU</p>
          <p className="text-xs text-success">Online · răspunde imediat</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
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
            className="clip-corner-cut-xs border border-border px-3 py-1.5 text-xs font-medium text-foreground"
          >
            {suggestion}
          </span>
        ))}
      </div>

      <div className="m-4 flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2">
        <span className="flex-1 text-sm text-muted-foreground">
          Întreabă orice despre proiectul tău…
        </span>
        <span className="grid size-8 place-items-center rounded-full bg-foreground text-background">
          <ArrowUp className="size-4" />
        </span>
      </div>
    </div>
  );
}
