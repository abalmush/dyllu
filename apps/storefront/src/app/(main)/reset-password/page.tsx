import type { Metadata } from "next";
import { notFound } from "next/navigation";

import CompletePasswordResetForm from "@modules/account/components/password-reset/complete-form";

export const metadata: Metadata = {
  title: "Parolă nouă",
  description: "Setează o parolă nouă pentru contul DYLLU.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    email?: string | string[];
    token?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const email = typeof query.email === "string" ? query.email : "";
  const token = typeof query.token === "string" ? query.token : "";
  if (!email || !token) notFound();

  return <CompletePasswordResetForm email={email} token={token} />;
}
