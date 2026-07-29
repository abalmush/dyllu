const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export const emailShell = (title: string, body: string) => `<!doctype html>
<html lang="ro">
  <body style="margin:0;background:#f4f4f2;font-family:Arial,sans-serif;color:#111">
    <div style="max-width:640px;margin:0 auto;padding:32px 20px">
      <div style="background:#111;color:#c3f000;padding:18px 24px;font-weight:800;letter-spacing:.12em">DYLLU</div>
      <div style="background:#fff;padding:28px 24px">
        <h1 style="margin:0 0 20px;font-size:26px">${escapeHtml(title)}</h1>
        ${body}
      </div>
      <p style="color:#666;font-size:12px;line-height:1.5">DYLLU Moldova · Acest mesaj a fost trimis automat.</p>
    </div>
  </body>
</html>`;

export const emailButton = (label: string, url: string) =>
  `<p style="margin:24px 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:#c3f000;color:#111;padding:14px 22px;text-decoration:none;font-weight:800">${escapeHtml(label)}</a></p>`;

export { escapeHtml };
