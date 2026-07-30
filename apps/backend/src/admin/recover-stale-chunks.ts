const RELOAD_KEY = "dyllu-admin-stale-chunk-reload";
const RELOAD_COOLDOWN_MS = 30_000;

function reloadOnce() {
  const previousReload = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
  if (Date.now() - previousReload < RELOAD_COOLDOWN_MS) return;
  sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  window.location.reload();
}

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  reloadOnce();
});

window.addEventListener("unhandledrejection", (event) => {
  const message =
    event.reason instanceof Error ? event.reason.message : String(event.reason);
  if (!message.includes("Failed to fetch dynamically imported module")) return;
  event.preventDefault();
  reloadOnce();
});
