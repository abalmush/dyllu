"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { SITE_CONTACT } from "@lib/site-content";
import { cn } from "@lib/utils";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";

export interface NewsletterFormProps {
  className?: string;
  invert?: boolean;
}

export function NewsletterForm({ className, invert }: NewsletterFormProps) {
  const [email, setEmail] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail.includes("@")) {
      toast.error("Te rugăm introdu un email valid");
      return;
    }

    setPending(true);

    const subject = encodeURIComponent("Abonare newsletter DYLLU");
    const body = encodeURIComponent(
      `Bună ziua,\n\nDoresc să primesc noutățile DYLLU pe adresa ${trimmedEmail}.\n`
    );

    window.location.href = `${SITE_CONTACT.emailHref}?subject=${subject}&body=${body}`;
    setPending(false);
    toast.message(
      "Se deschide aplicația de email pentru confirmarea abonării."
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex w-full max-w-lg flex-col gap-2", className)}
    >
      <label htmlFor="newsletter-email" className="sr-only">
        Adresa de email
      </label>
      <Input
        id="newsletter-email"
        type="email"
        required
        placeholder="adresa@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={cn(
          "h-12 w-full rounded-full border-2 px-5",
          invert &&
            "border-background/30 bg-background/10 text-background placeholder:text-background/60 focus-visible:ring-background"
        )}
      />
      <Button
        type="submit"
        size="lg"
        variant={invert ? "brand" : "default"}
        isLoading={pending}
        className="h-12 w-full rounded-full px-6"
      >
        Solicită abonarea
        {!pending && <ArrowRight className="size-4" />}
      </Button>
      <p
        className={cn(
          "px-1 text-xs",
          invert ? "text-secondary-foreground/60" : "text-muted-foreground"
        )}
      >
        Confirmarea se face prin email la{" "}
        <a
          href={SITE_CONTACT.emailHref}
          className="underline underline-offset-4 hover:text-current"
        >
          {SITE_CONTACT.email}
        </a>
        .
      </p>
    </form>
  );
}
