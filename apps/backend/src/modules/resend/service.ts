import type {
  Logger,
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types";
import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils";

type Dependencies = {
  logger: Logger;
};

type Options = {
  apiKey: string;
  fromEmail: string;
};

type ResendResponse = {
  id?: string;
  message?: string;
  name?: string;
};

export default class ResendNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "resend";

  protected readonly logger_: Logger;
  protected readonly options_: Options;

  constructor({ logger }: Dependencies, options: Options) {
    super();
    this.logger_ = logger;
    this.options_ = options;
  }

  static validateOptions(options: Record<string, unknown>) {
    if (
      typeof options.apiKey !== "string" ||
      typeof options.fromEmail !== "string"
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Resend requires apiKey and fromEmail"
      );
    }
  }

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    const content = notification.content;
    if (!content?.subject || (!content.html && !content.text)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Email template "${notification.template}" has no content`
      );
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options_.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: notification.from || this.options_.fromEmail,
        to: [notification.to],
        subject: content.subject,
        html: content.html,
        text: content.text,
      }),
    });
    const result = (await response.json().catch(() => ({}))) as ResendResponse;

    if (!response.ok || !result.id) {
      this.logger_.error(
        `Resend rejected "${notification.template}": ${result.message || response.statusText}`
      );
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Email delivery failed"
      );
    }

    return { id: result.id };
  }
}
