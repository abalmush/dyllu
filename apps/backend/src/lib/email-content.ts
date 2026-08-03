export type EmailContent = {
  subject: string;
  text: string;
  html: string;
};

export type EmailHeroStat = {
  label: string;
  value: string;
};

type EmailAction = {
  label: string;
  url: string;
};

type EmailHeroOptions = {
  eyebrow: string;
  title: string;
  description: string;
  descriptionEmphasis?: string;
  stats?: EmailHeroStat[];
  action?: EmailAction;
};

type EmailDocumentOptions = {
  title: string;
  preheader: string;
  trustedBodyHtml: string;
};

type BrandedActionEmailOptions = {
  subject: string;
  preheader: string;
  eyebrow: string;
  title: string;
  description: string;
  action: EmailAction;
  details: {
    eyebrow: string;
    title: string;
    description: string;
  };
  note?: string;
};

export const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const normalizeHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
};

const requireHttpUrl = (value: string) => {
  const url = normalizeHttpUrl(value);
  if (!url) throw new Error("Email action requires a valid HTTP URL");
  return url;
};

const renderStats = (stats: EmailHeroStat[]) => {
  if (!stats.length) return "";

  const width = `${100 / stats.length}%`;
  const cells = stats
    .map(
      (stat, index) => `<td
        class="stat-cell"
        width="${width}"
        valign="top"
        style="padding:${index === 0 ? "0 10px 0 0" : index === stats.length - 1 ? "0 0 0 10px" : "0 5px"}"
      >
        <div style="min-height:78px;padding:16px;background:#20211d;border:1px solid #30312d">
          <div style="color:#a9aaa4;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase">${escapeHtml(stat.label)}</div>
          <div style="margin-top:8px;color:#fff;font-size:20px;font-weight:900;white-space:nowrap">${escapeHtml(stat.value)}</div>
        </div>
      </td>`
    )
    .join("");

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:30px;width:100%;border-collapse:separate;border-spacing:0"><tr>${cells}</tr></table>`;
};

export const renderEmailHero = ({
  eyebrow,
  title,
  description,
  descriptionEmphasis,
  stats = [],
  action,
}: EmailHeroOptions) => {
  const actionUrl = action ? normalizeHttpUrl(action.url) : null;
  const actionHtml =
    action && actionUrl
      ? `<div style="margin-top:30px"><a href="${escapeHtml(actionUrl)}" style="color:#c3ef18;font-size:15px;font-weight:800;text-decoration:none">${escapeHtml(action.label)}&nbsp;&nbsp;→</a></div>`
      : "";
  const emphasisHtml = descriptionEmphasis
    ? ` <strong style="color:#fff">${escapeHtml(descriptionEmphasis)}</strong>`
    : "";

  return `<tr>
    <td class="hero" style="padding:42px 44px;background-color:#0b0b0b;background-image:linear-gradient(115deg,#29360f 0%,#11130d 48%,#080808 100%);clip-path:polygon(22px 0,100% 0,100% calc(100% - 22px),calc(100% - 22px) 100%,0 100%,0 22px);color:#fff">
      <div style="margin-bottom:28px;color:#c3ef18;font-size:17px;font-weight:900;letter-spacing:.16em">DYLLU</div>
      <div style="display:inline-block;padding:9px 14px;background:#c3ef18;color:#111;font-size:12px;font-weight:900;letter-spacing:.1em;text-transform:uppercase">✓&nbsp;&nbsp;${escapeHtml(eyebrow)}</div>
      <h1 class="hero-title" style="margin:26px 0 0;color:#fff;font-size:46px;line-height:1.08;letter-spacing:-1.5px">${escapeHtml(title)}</h1>
      <p style="margin:18px 0 0;color:#c9c9c5;font-size:17px;line-height:26px">${escapeHtml(description)}${emphasisHtml}</p>
      ${renderStats(stats)}
      ${actionHtml}
    </td>
  </tr>`;
};

export const renderEmailDocument = ({
  title,
  preheader,
  trustedBodyHtml,
}: EmailDocumentOptions) => `<!doctype html>
<html lang="ro">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      @media only screen and (max-width: 620px) {
        .email-shell { padding: 0 !important; }
        .email-container { width: 100% !important; }
        .hero, .content-section { padding: 28px 20px !important; }
        .hero-title { font-size: 34px !important; }
        .stat-cell { display: block !important; width: 100% !important; padding: 0 0 10px !important; }
        .details-column { display: block !important; width: 100% !important; padding: 0 0 22px !important; }
        .product-image-cell { width: 62px !important; padding-right: 10px !important; }
        .product-image { width: 52px !important; height: 52px !important; }
        .product-price-cell { width: 118px !important; }
      }
    </style>
  </head>
  <body data-email-style="dyllu-transactional-v1" style="margin:0;padding:0;background:#f4f4f2;color:#111;font-family:Arial,Helvetica,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;background:#f4f4f2">
      <tr>
        <td class="email-shell" align="center" style="padding:32px 16px">
          <table role="presentation" class="email-container" width="720" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:720px;border-collapse:collapse">
            ${trustedBodyHtml}
            <tr>
              <td style="padding:18px 4px;color:#69696d;font-size:12px;line-height:18px">DYLLU Moldova · Acest mesaj a fost trimis automat.</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

export const createBrandedActionEmail = ({
  subject,
  preheader,
  eyebrow,
  title,
  description,
  action,
  details,
  note,
}: BrandedActionEmailOptions): EmailContent => {
  const actionUrl = requireHttpUrl(action.url);
  const hero = renderEmailHero({
    eyebrow,
    title,
    description,
    action: { ...action, url: actionUrl },
  });
  const noteHtml = note
    ? `<div style="margin-top:22px;padding:18px 20px;background:#f5f5f3;color:#68686f;font-size:13px;line-height:20px">${escapeHtml(note)}</div>`
    : "";
  const detailsHtml = `<tr>
    <td class="content-section" style="padding:42px 44px;background:#fff">
      <div style="color:#68686f;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase">${escapeHtml(details.eyebrow)}</div>
      <h2 style="margin:9px 0 0;color:#111;font-size:30px;line-height:1.12;letter-spacing:-.5px">${escapeHtml(details.title)}</h2>
      <p style="margin:14px 0 0;color:#68686f;font-size:15px;line-height:23px">${escapeHtml(details.description)}</p>
      ${noteHtml}
    </td>
  </tr>`;
  const text = [
    title,
    description,
    `${action.label}: ${actionUrl}`,
    details.title,
    details.description,
    note,
    "DYLLU Moldova",
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    subject,
    text,
    html: renderEmailDocument({
      title: subject,
      preheader,
      trustedBodyHtml: `${hero}${detailsHtml}`,
    }),
  };
};
