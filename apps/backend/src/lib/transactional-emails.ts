import { createBrandedActionEmail, type EmailContent } from "./email-content";

export const createPasswordResetEmail = (resetUrl: string): EmailContent =>
  createBrandedActionEmail({
    subject: "Resetarea parolei DYLLU",
    preheader: "Folosește linkul securizat pentru a seta o parolă nouă.",
    eyebrow: "Securitatea contului",
    title: "Resetează parola",
    description: "Am primit o solicitare de resetare a parolei tale DYLLU.",
    action: {
      label: "Resetează parola",
      url: resetUrl,
    },
    details: {
      eyebrow: "Important",
      title: "Link valabil 15 minute",
      description:
        "Deschide linkul pe același dispozitiv și alege o parolă nouă, diferită de cele folosite anterior.",
    },
    note: "Dacă nu ai făcut această solicitare, ignoră mesajul. Parola ta nu va fi modificată.",
  });

export const createUserInviteEmail = (inviteUrl: string): EmailContent =>
  createBrandedActionEmail({
    subject: "Invitație în administrarea DYLLU",
    preheader: "Ai fost invitat să te alături echipei DYLLU.",
    eyebrow: "Invitație DYLLU",
    title: "Bine ai venit în echipă",
    description: "Ai primit acces la administrarea magazinului DYLLU.",
    action: {
      label: "Acceptă invitația",
      url: inviteUrl,
    },
    details: {
      eyebrow: "Acces administrativ",
      title: "Finalizează configurarea",
      description:
        "Acceptă invitația și setează datele contului pentru a intra în panoul de administrare.",
    },
    note: "Dacă nu recunoști această invitație, nu deschide linkul și informează echipa DYLLU.",
  });

export const createNewsletterConfirmationEmail = (
  confirmationUrl: string
): EmailContent =>
  createBrandedActionEmail({
    subject: "Confirmă abonarea la noutățile DYLLU",
    preheader: "Confirmă adresa pentru a primi noutățile DYLLU.",
    eyebrow: "Newsletter DYLLU",
    title: "Confirmă abonarea",
    description: "Mai este un singur pas până la activarea abonării tale.",
    action: {
      label: "Confirmă adresa de email",
      url: confirmationUrl,
    },
    details: {
      eyebrow: "Ce vei primi",
      title: "Noutăți care merită deschise",
      description:
        "Produse noi, ghiduri practice și oferte DYLLU, trimise doar după confirmarea adresei.",
    },
    note: "Dacă nu ai solicitat abonarea, ignoră mesajul și adresa nu va fi adăugată în listă.",
  });
