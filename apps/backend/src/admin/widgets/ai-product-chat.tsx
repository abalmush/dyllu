import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types";
import {
  Button,
  Container,
  Heading,
  IconButton,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui";
import { ArrowUturnLeft, PaperPlane, SparklesSolid } from "@medusajs/icons";
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
  return Math.random().toString(36).slice(2);
}

function ChatWidget({ data }: DetailWidgetProps<AdminProduct>) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      role: "assistant",
      text:
        "Salut. Sunt asistentul AI pentru editare produs. Pot rescrie descrierea, ajusta titlul, sau curăța imaginea (fundal alb, fără badge-uri). Spune-mi ce vrei să schimbi — îți voi arăta o previzualizare înainte de a aplica.",
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
          description: err instanceof Error ? err.message : "eroare necunoscută",
        });
      }
    },
    [data.id, messages]
  );

  return (
    <Container className="flex h-[640px] flex-col gap-3 divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <SparklesSolid className="text-ui-fg-interactive" />
          <Heading level="h2">Asistent AI</Heading>
        </div>
        <Text size="xsmall" className="text-ui-fg-subtle">
          {data.title}
        </Text>
      </div>

      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto px-6 py-4"
      >
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} onApply={() => apply(m.id)} />
        ))}
      </div>

      {messages.length === 1 && (
        <div className="space-y-2 px-6 py-3">
          <Text size="xsmall" className="text-ui-fg-subtle">
            Sugestii rapide
          </Text>
          <div className="flex flex-wrap gap-2">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                disabled={sending}
                className="rounded-full border border-ui-border-base bg-ui-bg-subtle px-3 py-1 text-xs text-ui-fg-base transition hover:border-ui-border-strong hover:bg-ui-bg-base disabled:opacity-50"
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
        <Textarea
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
        <IconButton
          type="submit"
          variant="primary"
          disabled={sending || !input.trim()}
          aria-label="Trimite mesaj"
        >
          <PaperPlane />
        </IconButton>
      </form>
    </Container>
  );
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
    <div className="mt-3 rounded-lg border border-ui-border-base bg-ui-bg-base p-3">
      <Text size="xsmall" weight="plus" className="text-ui-fg-subtle">
        Propunere · {proposal.kind === "image_edit" ? "Imagine" : proposal.kind === "title" ? "Titlu" : "Descriere"}
      </Text>

      {proposal.kind === "image_edit" ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Text size="xsmall" className="text-ui-fg-muted">Înainte</Text>
            <img src={proposal.sourceUrl} alt="" className="aspect-square w-full rounded border border-ui-border-base object-contain" />
          </div>
          <div className="space-y-1">
            <Text size="xsmall" className="text-ui-fg-muted">După</Text>
            <img src={proposal.previewUrl} alt="" className="aspect-square w-full rounded border border-ui-border-base object-contain" />
          </div>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="rounded bg-ui-bg-subtle p-2 text-xs">
            <Text size="xsmall" className="text-ui-fg-muted">Actual</Text>
            <p className="mt-1 whitespace-pre-wrap text-ui-fg-base">{proposal.currentValue}</p>
          </div>
          <div className="rounded bg-ui-tag-green-bg p-2 text-xs">
            <Text size="xsmall" className="text-ui-fg-muted">Propus</Text>
            <p className="mt-1 whitespace-pre-wrap text-ui-fg-base">{proposal.proposedValue}</p>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        {applied ? (
          <Text size="xsmall" className="text-ui-tag-green-text">
            ✓ Aplicat
          </Text>
        ) : (
          <Button size="small" variant="primary" onClick={onApply}>
            Aplică
          </Button>
        )}
        {!applied && (
          <Button size="small" variant="secondary">
            <ArrowUturnLeft />
            Modifică promptul
          </Button>
        )}
      </div>
    </div>
  );
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
});

export default ChatWidget;
