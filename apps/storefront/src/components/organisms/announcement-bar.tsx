"use client";

import * as React from "react";
import { Truck, X, Phone, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { SITE_CONTACT } from "@lib/site-content";
import { cn } from "@lib/utils";

type Message = {
  icon: React.ReactNode;
  text: string;
};

const STORAGE_KEY = "dyllu_announcement_dismissed";

export interface AnnouncementBarProps {
  messages?: Message[];
  className?: string;
}

export function AnnouncementBar({
  messages: propMessages,
  className,
}: AnnouncementBarProps) {
  const t = useTranslations("AnnouncementBar");
  const messages: Message[] = propMessages ?? [
    { icon: <Truck className="size-3.5" />, text: t("freeShipping") },
    { icon: <ShieldCheck className="size-3.5" />, text: t("onlineOrder") },
    {
      icon: <Phone className="size-3.5" />,
      text: t("support", {
        hours: SITE_CONTACT.hoursShort,
        phone: SITE_CONTACT.phoneDisplay,
      }),
    },
  ];
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
        "bg-secondary text-secondary-foreground relative w-full overflow-hidden",
        className
      )}
    >
      <div className="content-container flex h-9 items-center justify-center gap-4 text-xs">
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
              <span className="bg-primary/15 text-primary grid size-5 place-items-center rounded-full">
                {m.icon}
              </span>
              <span className="font-medium tracking-tight">{m.text}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t("close")}
          className="text-secondary-foreground/70 hover:bg-background/10 hover:text-secondary-foreground rounded-full p-1 transition-colors"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
