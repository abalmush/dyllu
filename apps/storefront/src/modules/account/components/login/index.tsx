import { login } from "@lib/data/customer";
import { LOGIN_VIEW } from "@modules/account/templates/login-template";
import ErrorMessage from "@modules/checkout/components/error-message";
import { SubmitButton } from "@modules/checkout/components/submit-button";
import Input from "@modules/common/components/input";
import { useActionState } from "react";
import LocalizedClientLink from "@modules/common/components/localized-client-link";

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void;
};

const Login = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(login, null);

  return (
    <div
      className="flex w-full max-w-sm flex-col items-center"
      data-testid="login-page"
    >
      <h1 className="font-display text-foreground mb-4 text-3xl font-bold tracking-tight">
        Bine ai revenit
      </h1>
      <p className="text-base-regular text-ui-fg-base mb-8 text-center">
        Autentifică-te pentru a accesa experiența completă DYLLU.
      </p>
      <form className="w-full" action={formAction}>
        <div className="flex w-full flex-col gap-y-2">
          <Input
            label="Email"
            name="email"
            type="email"
            title="Introdu o adresă de email validă."
            autoComplete="email"
            required
            data-testid="email-input"
          />
          <Input
            label="Parolă"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            data-testid="password-input"
          />
          <LocalizedClientLink
            href="/forgot-password"
            className="text-brand-800 self-end text-sm font-semibold underline underline-offset-4"
          >
            Ai uitat parola?
          </LocalizedClientLink>
        </div>
        <ErrorMessage error={message} data-testid="login-error-message" />
        <SubmitButton data-testid="sign-in-button" className="mt-6 w-full">
          Autentificare
        </SubmitButton>
      </form>
      <span className="text-small-regular text-ui-fg-base mt-6 text-center">
        Nu ai cont încă?{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
          className="text-brand-800 rounded-sm px-1 font-semibold underline underline-offset-4"
          data-testid="register-button"
        >
          Creează unul
        </button>
        .
      </span>
    </div>
  );
};

export default Login;
