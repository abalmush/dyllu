import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types";
import { toast } from "@medusajs/ui";
import { useCallback, useEffect, useRef, useState } from "react";

type Role = "user" | "assistant" | "system";

type ProposedChange =
  | {
      kind: "description";
      currentValue: string;
      proposedValue: string;
      summary: string;
    }
  | {
      kind: "title";
      currentValue: string;
      proposedValue: string;
      summary: string;
    }
  | {
      kind: "image_edit";
      sourceUrl: string;
      previewUrl: string;
      summary: string;
    };

type Message = {
  id: string;
  role: Role;
  text: string;
  pending?: boolean;
  proposal?: ProposedChange;
  applied?: boolean;
};

const STARTERS = [
  "Curăță imaginea produsului — fundal alb, fără badge-uri promoționale",
  "Rescrie descrierea mai concisă, accent pe motor brushless",
  "Generează un titlu SEO mai bun",
];

function genId() {
  return crypto.randomUUID();
}

function DevelopmentChatWidget({ data }: DetailWidgetProps<AdminProduct>) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      role: "assistant",
      text: "Salut. Sunt asistentul AI pentru editare produs. Pot rescrie descrierea, ajusta titlul, sau curăța imaginea (fundal alb, fără badge-uri). Spune-mi ce vrei să schimbi — îți voi arăta o previzualizare înainte de a aplica.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      setInput("");
      setSending(true);
      const userMsg: Message = { id: genId(), role: "user", text: trimmed };
      const pendingId = genId();
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: pendingId, role: "assistant", text: "", pending: true },
      ]);
      try {
        const res = await fetch(`/admin/ai-edit/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            product_id: data.id,
            message: trimmed,
            history: messages
              .filter((m) => !m.pending)
              .map((m) => ({ role: m.role, text: m.text })),
          }),
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const body = (await res.json()) as {
          reply: string;
          proposal?: ProposedChange;
        };
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId
              ? {
                  ...m,
                  pending: false,
                  text: body.reply,
                  proposal: body.proposal,
                }
              : m
          )
        );
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId
              ? {
                  ...m,
                  pending: false,
                  text:
                    "Nu am putut contacta asistentul: " +
                    (err instanceof Error ? err.message : "eroare necunoscută"),
                }
              : m
          )
        );
      } finally {
        setSending(false);
      }
    },
    [data.id, messages, sending]
  );

  const apply = useCallback(
    async (msgId: string) => {
      const msg = messages.find((m) => m.id === msgId);
      if (!msg?.proposal) return;
      try {
        const res = await fetch(`/admin/ai-edit/apply`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            product_id: data.id,
            proposal: msg.proposal,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, applied: true } : m))
        );
        toast.success("Modificare aplicată", {
          description: msg.proposal.summary,
        });
      } catch (err) {
        toast.error("Nu am putut aplica modificarea", {
          description:
            err instanceof Error ? err.message : "eroare necunoscută",
        });
      }
    },
    [data.id, messages]
  );

  return (
    <div className="border-ui-border-base bg-ui-bg-base shadow-elevation-card-rest flex h-[640px] flex-col gap-3 divide-y rounded-lg border p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-ui-fg-interactive">
            ✦
          </span>
          <h2 className="text-ui-fg-base text-base font-semibold">
            Asistent AI
          </h2>
        </div>
        <p className="text-ui-fg-subtle text-xs">{data.title}</p>
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} onApply={() => apply(m.id)} />
        ))}
      </div>

      {messages.length === 1 && (
        <div className="space-y-2 px-6 py-3">
          <p className="text-ui-fg-subtle text-xs">Sugestii rapide</p>
          <div className="flex flex-wrap gap-2">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                disabled={sending}
                className="border-ui-border-base bg-ui-bg-subtle text-ui-fg-base hover:border-ui-border-strong hover:bg-ui-bg-base rounded-full border px-3 py-1 text-xs transition disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2 px-6 py-4"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Cere o modificare — text, imagine, titlu…"
          rows={2}
          disabled={sending}
          className="flex-1 resize-none"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          aria-label="Trimite mesaj"
          className="bg-ui-bg-interactive text-ui-fg-on-color flex size-10 shrink-0 items-center justify-center rounded-md disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span aria-hidden="true">→</span>
        </button>
      </form>
    </div>
  );
}

function ChatWidget(props: DetailWidgetProps<AdminProduct>) {
  if (process.env.NODE_ENV === "production") return null;
  return <DevelopmentChatWidget {...props} />;
}

function ChatMessage({
  message,
  onApply,
}: {
  message: Message;
  onApply: () => void;
}) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
          isUser
            ? "bg-ui-bg-interactive text-ui-fg-on-color"
            : "bg-ui-bg-subtle text-ui-fg-base"
        }`}
      >
        {message.pending ? (
          <span className="inline-flex gap-1">
            <span className="animate-pulse">●</span>
            <span className="animate-pulse [animation-delay:0.15s]">●</span>
            <span className="animate-pulse [animation-delay:0.3s]">●</span>
          </span>
        ) : (
          <>
            <p className="whitespace-pre-wrap">{message.text}</p>
            {message.proposal && (
              <ProposalCard
                proposal={message.proposal}
                applied={!!message.applied}
                onApply={onApply}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ProposalCard({
  proposal,
  applied,
  onApply,
}: {
  proposal: ProposedChange;
  applied: boolean;
  onApply: () => void;
}) {
  return (
    <div className="border-ui-border-base bg-ui-bg-base mt-3 rounded-lg border p-3">
      <p className="text-ui-fg-subtle text-xs font-semibold">
        Propunere ·{" "}
        {proposal.kind === "image_edit"
          ? "Imagine"
          : proposal.kind === "title"
            ? "Titlu"
            : "Descriere"}
      </p>

      {proposal.kind === "image_edit" ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <p className="text-ui-fg-muted text-xs">Înainte</p>
            <img
              src={proposal.sourceUrl}
              alt=""
              className="border-ui-border-base aspect-square w-full rounded border object-contain"
            />
          </div>
          <div className="space-y-1">
            <p className="text-ui-fg-muted text-xs">După</p>
            <img
              src={proposal.previewUrl}
              alt=""
              className="border-ui-border-base aspect-square w-full rounded border object-contain"
            />
          </div>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="bg-ui-bg-subtle rounded p-2 text-xs">
            <p className="text-ui-fg-muted text-xs">Actual</p>
            <p className="text-ui-fg-base mt-1 whitespace-pre-wrap">
              {proposal.currentValue}
            </p>
          </div>
          <div className="bg-ui-tag-green-bg rounded p-2 text-xs">
            <p className="text-ui-fg-muted text-xs">Propus</p>
            <p className="text-ui-fg-base mt-1 whitespace-pre-wrap">
              {proposal.proposedValue}
            </p>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        {applied ? (
          <p className="text-ui-tag-green-text text-xs">✓ Aplicat</p>
        ) : (
          <button
            type="button"
            className="bg-ui-bg-interactive text-ui-fg-on-color rounded-md px-3 py-1.5 text-xs font-medium"
            onClick={onApply}
          >
            Aplică
          </button>
        )}
      </div>
    </div>
  );
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
});

export default ChatWidget;
