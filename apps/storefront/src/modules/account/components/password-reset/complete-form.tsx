"use client";

import { useActionState } from "react";

import { completePasswordReset } from "@lib/data/customer";
import ErrorMessage from "@modules/checkout/components/error-message";
import { SubmitButton } from "@modules/checkout/components/submit-button";
import Input from "@modules/common/components/input";

type Props = {
  email: string;
  token: string;
};

export default function CompletePasswordResetForm({ email, token }: Props) {
  const [message, formAction] = useActionState(completePasswordReset, null);

  return (
    <div className="mx-auto w-full max-w-md px-6 py-16">
      <h1 className="font-display text-3xl font-bold">Alege o parolă nouă</h1>
      <form action={formAction} className="mt-8 space-y-4">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="token" value={token} />
        <Input
          label="Parolă nouă"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <Input
          label="Confirmă parola"
          name="password_confirmation"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <ErrorMessage error={message} />
        <SubmitButton className="w-full">Salvează parola</SubmitButton>
      </form>
    </div>
  );
}
