"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Bot, Check, Search, Send, ShoppingCart, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/atoms/button";
import { useCart } from "@lib/cart/cart-context";
import { convertToLocale } from "@lib/util/money";

const productHitSchema = z.object({
  objectID: z.string(),
  title: z.string(),
  handle: z.string(),
  thumbnail: z.string().nullable(),
  price: z.number().nullable(),
  original_price: z.number().nullable(),
  on_sale: z.boolean(),
  variant_id: z.string().nullable(),
  variant_title: z.string().nullable(),
});

const toolOutputSchema = z.object({ hits: z.array(productHitSchema) });

type MessagePart = UIMessage["parts"][number];
type ProductHit = z.infer<typeof productHitSchema>;

function getProductHits(part: MessagePart): ProductHit[] {
  if (!part.type.startsWith("tool-")) return [];
  const state = "state" in part ? part.state : undefined;
  if (state !== "output-available") return [];
  const parsed = toolOutputSchema.safeParse(
    "output" in part ? part.output : undefined
  );
  return parsed.success ? parsed.data.hits : [];
}

function isToolInProgress(part: MessagePart): boolean {
  if (!part.type.startsWith("tool-")) return false;
  const state = "state" in part ? part.state : undefined;
  return state !== "output-available" && state !== "output-error";
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 px-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="bg-muted-foreground/60 size-1.5 animate-bounce rounded-full"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

function ProductHitCard({ hit }: { hit: ProductHit }) {
  const { addItem } = useCart();
  const [status, setStatus] = React.useState<"idle" | "adding" | "added">(
    "idle"
  );

  const handleAddToCart = async () => {
    if (!hit.variant_id || status === "adding") return;
    setStatus("adding");
    try {
      await addItem(
        { variantId: hit.variant_id, quantity: 1 },
        {
          variantId: hit.variant_id,
          productHandle: hit.handle,
          title: hit.title,
          variantTitle: hit.variant_title ?? undefined,
          thumbnail: hit.thumbnail ?? undefined,
          quantity: 1,
          unitPrice: hit.price ?? 0,
          currencyCode: "mdl",
        }
      );
      setStatus("added");
      window.setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("idle");
      toast.error("Nu am reușit să adăugăm produsul în coș.");
    }
  };

  return (
    <div className="border-border bg-background flex w-32 shrink-0 snap-start flex-col rounded-md border p-2">
      <Link
        href={`/products/${hit.handle}`}
        className="bg-muted relative mb-2 aspect-square w-full overflow-hidden rounded-md"
      >
        {hit.thumbnail ? (
          <Image
            src={hit.thumbnail}
            alt=""
            fill
            sizes="128px"
            className="object-contain p-1"
          />
        ) : (
          <span className="text-muted-foreground absolute inset-0 grid place-items-center">
            <Search className="size-5" />
          </span>
        )}
      </Link>
      <Link href={`/products/${hit.handle}`} className="min-w-0 flex-1">
        <p className="line-clamp-2 text-xs leading-snug font-medium">
          {hit.title}
        </p>
      </Link>
      {hit.price !== null && (
        <p className="text-foreground mt-1 text-sm font-semibold">
          {convertToLocale({ amount: hit.price, currency_code: "MDL" })}
        </p>
      )}
      <button
        type="button"
        aria-label={`Adaugă ${hit.title} în coș`}
        disabled={!hit.variant_id || status === "adding"}
        onClick={() => void handleAddToCart()}
        className="bg-foreground text-background hover:bg-foreground/90 mt-2 flex h-8 items-center justify-center gap-1 rounded-md text-xs font-medium transition-colors disabled:opacity-40"
      >
        {status === "added" ? (
          <>
            <Check aria-hidden="true" className="size-3.5" />
            Adăugat
          </>
        ) : (
          <>
            <ShoppingCart aria-hidden="true" className="size-3.5" />
            În coș
          </>
        )}
      </button>
    </div>
  );
}

function ProductCarousel({ hits }: { hits: ProductHit[] }) {
  return (
    <div
      data-lenis-prevent
      className="-mx-1 flex snap-x gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1"
    >
      {hits.map((hit) => (
        <ProductHitCard key={hit.objectID} hit={hit} />
      ))}
    </div>
  );
}

function AssistantMessage({ message }: { message: UIMessage }) {
  // The agent often runs several near-duplicate searches (synonyms/translations
  // of the same term), so dedupe products across the whole message to avoid the
  // same item appearing in multiple carousels.
  const seen = new Set<string>();
  const blocks = message.parts
    .map((part, index) => {
      const key = `${message.id}-${index}`;
      if (part.type === "text") {
        if (!part.text.trim()) return null;
        return (
          <div
            key={key}
            className="bg-muted text-foreground max-w-[90%] rounded-md px-3 py-2 text-sm"
          >
            <span className="whitespace-pre-wrap">{part.text}</span>
          </div>
        );
      }
      const hits = getProductHits(part).filter((hit) => {
        if (seen.has(hit.objectID)) return false;
        seen.add(hit.objectID);
        return true;
      });
      if (hits.length > 0) {
        return <ProductCarousel key={key} hits={hits} />;
      }
      if (isToolInProgress(part)) {
        return (
          <div
            key={key}
            className="bg-muted text-muted-foreground flex max-w-[85%] items-center gap-2 rounded-md px-3 py-2 text-sm"
          >
            <Search aria-hidden="true" className="size-3.5" />
            Caut produse…
            <TypingDots />
          </div>
        );
      }
      return null;
    })
    .filter(Boolean);

  if (blocks.length === 0) return null;
  return <div className="space-y-2">{blocks}</div>;
}

export function AiAssistantWidget() {
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const listRef = React.useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/assistant" }),
  });

  const isBusy = status === "submitted" || status === "streaming";
  const lastMessage = messages[messages.length - 1];
  const lastMessageHasContent =
    lastMessage?.role === "assistant" &&
    (lastMessage.parts.some(
      (part) => part.type === "text" && part.text.trim().length > 0
    ) ||
      lastMessage.parts.some(
        (part) => getProductHits(part).length > 0 || isToolInProgress(part)
      ));
  const showError = Boolean(error) && !lastMessageHasContent;

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
            {messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="flex">
                  <div className="bg-foreground text-background ml-auto max-w-[85%] rounded-md px-3 py-2 text-sm">
                    <span className="whitespace-pre-wrap">
                      {message.parts
                        .filter((part) => part.type === "text")
                        .map((part) => part.text)
                        .join("")}
                    </span>
                  </div>
                </div>
              ) : (
                <AssistantMessage key={message.id} message={message} />
              )
            )}
            {isBusy && !lastMessageHasContent && (
              <div className="bg-muted text-muted-foreground flex max-w-[85%] items-center rounded-md px-3 py-2 text-sm">
                <TypingDots />
              </div>
            )}
            {showError && (
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
