"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Bot, Check, Search, Send, ShoppingCart, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { z } from "zod";

import { cn } from "@lib/utils";
import { Button } from "@/components/atoms/button";
import { useCart } from "@lib/cart/cart-context";
import { convertToLocale } from "@lib/util/money";

const productHitSchema = z.object({
  objectID: z.string(),
  title: z.string(),
  title_ru: z.string().nullable().optional(),
  handle: z.string(),
  thumbnail: z.string().nullable(),
  price: z.number().nullable(),
  original_price: z.number().nullable(),
  on_sale: z.boolean(),
  variant_id: z.string().nullable(),
  variant_title: z.string().nullable(),
});

const toolOutputSchema = z.object({ hits: z.array(productHitSchema) });

type ProductHit = z.infer<typeof productHitSchema>;

function getProductHits(part: UIMessage["parts"][number]): ProductHit[] {
  if (!part.type.startsWith("tool-")) return [];
  const state = "state" in part ? part.state : undefined;
  if (state !== "output-available") return [];
  const parsed = toolOutputSchema.safeParse(
    "output" in part ? part.output : undefined
  );
  return parsed.success ? parsed.data.hits : [];
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
  const t = useTranslations("AiAssistant");
  const locale = useLocale();
  const { addItem } = useCart();
  const [status, setStatus] = React.useState<"idle" | "adding" | "added">(
    "idle"
  );
  const title = locale === "ru" && hit.title_ru ? hit.title_ru : hit.title;

  const handleAddToCart = async () => {
    if (!hit.variant_id || status === "adding") return;
    setStatus("adding");
    try {
      await addItem(
        { variantId: hit.variant_id, quantity: 1 },
        {
          variantId: hit.variant_id,
          productHandle: hit.handle,
          title,
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
      toast.error(t("addToCartError"));
    }
  };

  return (
    <div className="border-border bg-background flex items-center gap-2 rounded-md border p-2">
      <Link
        href={`/products/${hit.handle}`}
        className="bg-muted relative size-12 shrink-0 overflow-hidden rounded-md"
      >
        {hit.thumbnail ? (
          <Image
            src={hit.thumbnail}
            alt=""
            fill
            sizes="48px"
            className="object-contain p-1"
          />
        ) : (
          <span className="text-muted-foreground absolute inset-0 grid place-items-center">
            <Search className="size-4" />
          </span>
        )}
      </Link>
      <Link href={`/products/${hit.handle}`} className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium">{title}</p>
        {hit.price !== null && (
          <p className="text-foreground text-sm font-semibold">
            {convertToLocale({ amount: hit.price, currency_code: "MDL" })}
          </p>
        )}
      </Link>
      <button
        type="button"
        aria-label={t("addToCart", { title })}
        disabled={!hit.variant_id || status === "adding"}
        onClick={() => void handleAddToCart()}
        className="bg-foreground text-background hover:bg-foreground/90 grid size-8 shrink-0 place-items-center rounded-md transition-colors disabled:opacity-40"
      >
        {status === "added" ? (
          <Check aria-hidden="true" className="size-3.5" />
        ) : (
          <ShoppingCart aria-hidden="true" className="size-3.5" />
        )}
      </button>
    </div>
  );
}

export function AiAssistantWidget() {
  const t = useTranslations("AiAssistant");
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
      lastMessage.parts.some((part) => getProductHits(part).length > 0));
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
              {t("title")}
            </span>
            <button
              type="button"
              aria-label={t("close")}
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
              <p className="text-muted-foreground text-sm">{t("emptyState")}</p>
            )}
            {messages.map((message) => {
              const hits = message.parts.flatMap(getProductHits);
              const text = message.parts
                .filter((part) => part.type === "text")
                .map((part) => part.text)
                .join("");
              const isSearchingProducts = message.parts.some(
                (part) =>
                  part.type.startsWith("tool-") &&
                  "state" in part &&
                  part.state !== "output-available" &&
                  part.state !== "output-error"
              );

              if (
                !text &&
                hits.length === 0 &&
                !isSearchingProducts &&
                message.role === "assistant"
              ) {
                return null;
              }

              return (
                <div key={message.id} className="space-y-2">
                  {text && (
                    <div
                      className={cn(
                        "max-w-[85%] rounded-md px-3 py-2 text-sm",
                        message.role === "user"
                          ? "bg-foreground text-background ml-auto"
                          : "bg-muted text-foreground"
                      )}
                    >
                      <span className="whitespace-pre-wrap">{text}</span>
                    </div>
                  )}
                  {isSearchingProducts && (
                    <div className="bg-muted text-muted-foreground flex max-w-[85%] items-center gap-2 rounded-md px-3 py-2 text-sm">
                      <Search aria-hidden="true" className="size-3.5" />
                      {t("searching")}
                      <TypingDots />
                    </div>
                  )}
                  {hits.length > 0 && (
                    <div className="space-y-2">
                      {hits.map((hit) => (
                        <ProductHitCard key={hit.objectID} hit={hit} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {isBusy && !lastMessageHasContent && (
              <div className="bg-muted text-muted-foreground flex max-w-[85%] items-center rounded-md px-3 py-2 text-sm">
                <TypingDots />
              </div>
            )}
            {showError && (
              <p className="text-destructive text-sm">{t("error")}</p>
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
              placeholder={t("placeholder")}
              disabled={isBusy}
              className="border-border bg-background placeholder:text-muted-foreground flex-1 rounded-md border px-3 py-2 text-sm outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2"
            />
            <Button
              type="submit"
              variant="brand"
              size="icon"
              disabled={isBusy || !input.trim()}
              aria-label={t("send")}
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
        aria-label={open ? t("close") : t("open")}
        data-testid="ai-assistant-button"
      >
        {open ? <X aria-hidden="true" /> : <Bot aria-hidden="true" />}
      </Button>
    </div>
  );
}
