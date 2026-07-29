import type { Logger } from "@medusajs/framework/types";

import ResendNotificationProviderService from "../service";

const logger = {
  error: jest.fn(),
} as unknown as Logger;

describe("ResendNotificationProviderService", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("sends rendered notification content through Resend", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    const service = new ResendNotificationProviderService(
      { logger },
      {
        apiKey: "re_test",
        fromEmail: "DYLLU <notifications@dyllu.md>",
      }
    );

    await expect(
      service.send({
        to: "client@example.com",
        channel: "email",
        template: "order-placed",
        content: {
          subject: "Comandă",
          html: "<p>Mulțumim</p>",
          text: "Mulțumim",
        },
      })
    ).resolves.toEqual({ id: "email_123" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer re_test",
        }),
      })
    );
  });

  it("fails before calling Resend when content is missing", async () => {
    const fetchMock = jest.spyOn(global, "fetch");
    const service = new ResendNotificationProviderService(
      { logger },
      {
        apiKey: "re_test",
        fromEmail: "DYLLU <notifications@dyllu.md>",
      }
    );

    await expect(
      service.send({
        to: "client@example.com",
        channel: "email",
        template: "missing",
      })
    ).rejects.toThrow(/has no content/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
