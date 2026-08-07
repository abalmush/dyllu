"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Bot, Send, X } from "lucide-react";

import { cn } from "@lib/utils";
import { Button } from "@/components/atoms/button";

export function AiAssistantWidget() {
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const listRef = React.useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/assistant" }),
  });

  const isBusy = status === "submitted" || status === "streaming";

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, isBusy]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isBusy) return;
    setInput("");
    void sendMessage({ text });
  };

  return (
    <div className="small:bottom-6 small:left-6 fixed bottom-4 left-4 z-40">
      {open && (
        <div className="border-border bg-background clip-corner-cut-sm clip-shadow-md mb-3 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-none border">
          <div className="border-border flex items-center justify-between border-b px-4 py-3">
            <span className="flex items-center gap-2 font-semibold tracking-tight">
              <Bot aria-hidden="true" className="size-4" />
              Asistent DYLLU
            </span>
            <button
              type="button"
              aria-label="Închide asistentul"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:bg-muted hover:text-foreground grid size-8 place-items-center rounded-md transition-colors"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>

          <div
            ref={listRef}
            data-lenis-prevent
            className="flex-1 space-y-3 overflow-y-auto p-4"
          >
            {messages.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Întreabă-mă despre produse, disponibilitate sau recomandări.
              </p>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[85%] rounded-md px-3 py-2 text-sm",
                  message.role === "user"
                    ? "bg-foreground text-background ml-auto"
                    : "bg-muted text-foreground"
                )}
              >
                {message.parts.map((part, index) =>
                  part.type === "text" ? (
                    <span key={index} className="whitespace-pre-wrap">
                      {part.text}
                    </span>
                  ) : null
                )}
              </div>
            ))}
            {isBusy && (
              <div className="bg-muted text-muted-foreground max-w-[85%] rounded-md px-3 py-2 text-sm">
                Scriu…
              </div>
            )}
            {error && (
              <p className="text-destructive text-sm">
                A apărut o eroare. Încearcă din nou.
              </p>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-border flex items-center gap-2 border-t p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Scrie un mesaj…"
              disabled={isBusy}
              className="border-border bg-background placeholder:text-muted-foreground flex-1 rounded-md border px-3 py-2 text-sm outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2"
            />
            <Button
              type="submit"
              variant="brand"
              size="icon"
              disabled={isBusy || !input.trim()}
              aria-label="Trimite"
              className="clip-corner-cut-sm rounded-none"
            >
              <Send aria-hidden="true" className="size-4" />
            </Button>
          </form>
        </div>
      )}

      <Button
        variant="brand"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        className="clip-corner-cut-sm clip-shadow-md rounded-none"
        aria-label={open ? "Închide asistentul" : "Deschide asistentul"}
        data-testid="ai-assistant-button"
      >
        {open ? <X aria-hidden="true" /> : <Bot aria-hidden="true" />}
      </Button>
    </div>
  );
}
