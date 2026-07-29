"use client";

import { useActionState } from "react";

import { requestPasswordReset } from "@lib/data/customer";
import ErrorMessage from "@modules/checkout/components/error-message";
import { SubmitButton } from "@modules/checkout/components/submit-button";
import Input from "@modules/common/components/input";
import LocalizedClientLink from "@modules/common/components/localized-client-link";

export default function RequestPasswordResetForm() {
  const [message, formAction] = useActionState(requestPasswordReset, null);

  return (
    <div className="mx-auto w-full max-w-md px-6 py-16">
      <h1 className="font-display text-3xl font-bold">Resetează parola</h1>
      <p className="text-muted-foreground mt-3">
        Introdu adresa contului. Îți vom trimite un link valabil 15 minute.
      </p>
      <form action={formAction} className="mt-8 space-y-4">
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        <ErrorMessage error={message} />
        <SubmitButton className="w-full">Trimite linkul</SubmitButton>
      </form>
      <LocalizedClientLink
        href="/account"
        className="mt-6 inline-block font-semibold underline underline-offset-4"
      >
        Înapoi la autentificare
      </LocalizedClientLink>
    </div>
  );
}
