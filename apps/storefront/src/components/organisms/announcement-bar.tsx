"use client";

import * as React from "react";
import { Truck, X, Phone, ShieldCheck } from "lucide-react";

import { SITE_CONTACT } from "@lib/site-content";
import { cn } from "@lib/utils";

type Message = {
  icon: React.ReactNode;
  text: string;
};

const DEFAULT_MESSAGES: Message[] = [
  {
    icon: <Truck className="size-3.5" />,
    text: "Livrare gratuită în Chișinău pentru comenzi peste 1.000 MDL",
  },
  {
    icon: <ShieldCheck className="size-3.5" />,
    text: "Comandă online, confirmare rapidă și retur în 14 zile",
  },
  {
    icon: <Phone className="size-3.5" />,
    text: `Suport și confirmări ${SITE_CONTACT.hoursShort} · ${SITE_CONTACT.phoneDisplay}`,
  },
];

const STORAGE_KEY = "dyllu_announcement_dismissed";

export interface AnnouncementBarProps {
  messages?: Message[];
  className?: string;
}

export function AnnouncementBar({
  messages = DEFAULT_MESSAGES,
  className,
}: AnnouncementBarProps) {
  const [dismissed, setDismissed] = React.useState(false);
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(window.sessionStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  React.useEffect(() => {
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % messages.length),
      4500
    );
    return () => window.clearInterval(id);
  }, [messages.length]);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
    }
  };

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-secondary text-secondary-foreground",
        className
      )}
    >
      <div className="content-container flex h-9 items-center justify-center gap-3 text-xs">
        <div className="relative flex h-9 flex-1 items-center justify-center overflow-hidden">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "absolute inset-0 flex items-center justify-center gap-2 transition-all duration-500",
                i === index
                  ? "translate-y-0 opacity-100"
                  : "-translate-y-2 opacity-0"
              )}
              aria-hidden={i !== index}
            >
              <span className="grid size-5 place-items-center rounded-full bg-primary/15 text-primary">
                {m.icon}
              </span>
              <span className="font-medium tracking-tight">{m.text}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Închide bara de anunțuri"
          className="rounded-full p-1 text-secondary-foreground/70 transition-colors hover:bg-background/10 hover:text-secondary-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
