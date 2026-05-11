"use client";

import * as React from "react";
import { ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@lib/utils";
import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";

export interface NewsletterFormProps {
  className?: string;
  invert?: boolean;
}

export function NewsletterForm({ className, invert }: NewsletterFormProps) {
  const [email, setEmail] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Te rugăm introdu un email valid");
      return;
    }
    setPending(true);
    setTimeout(() => {
      setPending(false);
      setSubmitted(true);
      toast.success("Mulțumim! Te-am adăugat la newsletter.");
    }, 600);
  };

  if (submitted) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-full border border-success/30 bg-success/10 px-5 py-3 text-sm font-medium text-success",
          className
        )}
      >
        <Check className="size-4" /> Te-ai abonat. Verifică-ți emailul.
      </div>
    );
  }

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
        Abonează-mă
        {!pending && <ArrowRight className="size-4" />}
      </Button>
    </form>
  );
}
