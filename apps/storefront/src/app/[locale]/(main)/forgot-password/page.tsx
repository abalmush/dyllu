import type { Metadata } from "next";

import RequestPasswordResetForm from "@modules/account/components/password-reset/request-form";

export const metadata: Metadata = {
  title: "Resetarea parolei",
  description: "Solicită un link pentru resetarea parolei contului DYLLU.",
};

export default function ForgotPasswordPage() {
  return <RequestPasswordResetForm />;
}
