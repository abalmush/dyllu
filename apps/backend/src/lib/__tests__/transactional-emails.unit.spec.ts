import {
  createNewsletterConfirmationEmail,
  createPasswordResetEmail,
  createUserInviteEmail,
} from "../transactional-emails";

describe("transactional email templates", () => {
  it.each([
    {
      name: "password reset",
      create: createPasswordResetEmail,
      title: "Resetează parola",
      action: "Resetează parola",
    },
    {
      name: "admin registration invite",
      create: createUserInviteEmail,
      title: "Bine ai venit în echipă",
      action: "Acceptă invitația",
    },
    {
      name: "newsletter confirmation",
      create: createNewsletterConfirmationEmail,
      title: "Confirmă abonarea",
      action: "Confirmă adresa de email",
    },
  ])(
    "renders $name with the shared DYLLU design",
    ({ create, title, action }) => {
      const email = create("https://dyllu.md/action?token=test&source=email");

      expect(email.html).toContain('data-email-style="dyllu-transactional-v1"');
      expect(email.html).toContain("background-image:linear-gradient");
      expect(email.html).toContain("DYLLU Moldova");
      expect(email.html).toContain(title);
      expect(email.html).toContain(action);
      expect(email.html).toContain("token=test&amp;source=email");
      expect(email.text).toContain(
        "https://dyllu.md/action?token=test&source=email"
      );
    }
  );

  it("rejects unsafe action links", () => {
    expect(() => createPasswordResetEmail("javascript:alert(1)")).toThrow(
      "Email action requires a valid HTTP URL"
    );
  });
});
