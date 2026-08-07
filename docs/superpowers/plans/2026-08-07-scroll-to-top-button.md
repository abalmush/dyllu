# Scroll-to-top Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global, cut-corner-styled "scroll to top" button that appears once the user has scrolled past one viewport height and smoothly returns them to the top on click.

**Architecture:** A single client component (`ScrollToTopButton`) mounted once in the true root layout (`src/app/layout.tsx`), driven by a throttled `window.scrollY` listener. It integrates with the site's existing Lenis smooth-scroll instance (via `useLenis()`) when active, falling back to native `window.scrollTo` otherwise, and respects `prefers-reduced-motion`.

**Tech Stack:** Next.js 16 (React Server/Client Components), Tailwind CSS v4 (`clip-corner-cut-*` utilities), `lenis/react` (already wired via `SmoothScrollProvider`), `lucide-react` icons, Playwright (e2e, browser-driven test — this behavior is DOM/scroll-driven and has no unit-test framework equivalent in this workspace; Vitest is not yet re-added per the storefront testing policy).

Design reference: `docs/superpowers/specs/2026-08-07-scroll-to-top-button-design.md`

---

## Key implementation facts (read before starting)

- **Lenis integration is required, not optional.** The storefront wraps everything in `<SmoothScrollProvider>` (`src/app/layout.tsx`), which conditionally renders `<ReactLenis root>` (`src/components/atoms/smooth-scroll-provider.tsx`) when motion is allowed. When Lenis is active, it drives scrolling via its own rAF loop; calling native `window.scrollTo({ behavior: "smooth" })` at the same time fights Lenis and looks janky. `useLenis()` from `lenis/react` returns the shared instance from a **global store** (not React context) when `root: true`, so it works correctly even though our button is a sibling of `SmoothScrollProvider`, not a child. It returns `undefined` when Lenis isn't active (reduced motion or `NEXT_PUBLIC_SMOOTH_SCROLL=off`) — the click handler must handle both cases.
- **The custom `small` breakpoint is 1024px, not Tailwind's default `sm` (640px).** Defined in `tailwind.config.ts` (`screens.small`). The mobile sticky add-to-cart bar (`src/modules/products/components/product-actions/mobile-actions.tsx`) is visible below 1024px (`small:hidden`) — i.e. on phones **and** tablets. The scroll-to-top button must use the same `small:` breakpoint (not `sm:`) to avoid overlapping it, or the overlap will reappear on tablet-width viewports.
- **`Button` atom already has an `icon` size (`size-11 p-0`)** and a `brand` variant (`bg-primary`/lime). The existing cut-corner precedent is `variant="brand" ... className="clip-corner-cut-sm rounded-none"` (`mobile-actions.tsx:96`). Reuse this exactly; do not use the `IconButton` atom (it's `rounded-full` with no `brand`-equivalent variant and would need a full style override).
- **Playwright's `toBeVisible()` ignores `opacity`** (it only checks display/visibility/bounding-box), so it cannot verify our opacity-driven show/hide. Assert on the `aria-hidden` attribute instead — it also happens to be the correct accessibility check.
- **`pointer-events-none` blocks Playwright's click actionability check** (element must "receive events"), so there's no need to separately test that the hidden button is unclickable — a `.click()` on it will fail Playwright's own actionability wait, which is sufficient coverage.

---

### Task 1: Write the failing e2e test

**Files:**

- Create: `apps/storefront/e2e/scroll-to-top.spec.ts`

- [ ] **Step 1: Write the test file**

```ts
import { expect, test } from "@playwright/test";

test.describe("scroll-to-top button", () => {
  test("appears past one viewport of scroll and returns to top on click", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => {
      document.body.style.minHeight = "400vh";
    });

    const button = page.getByTestId("scroll-to-top-button");
    await expect(button).toHaveAttribute("aria-hidden", "true");

    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.5));
    await expect(button).toHaveAttribute("aria-hidden", "false");

    await button.click();

    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
      .toBeLessThan(5);
  });

  test("jumps instead of animating when prefers-reduced-motion is set", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.evaluate(() => {
      document.body.style.minHeight = "400vh";
    });
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.5));

    const button = page.getByTestId("scroll-to-top-button");
    await expect(button).toHaveAttribute("aria-hidden", "false");

    await button.click();

    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
      .toBeLessThan(5);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run (from `apps/storefront`):

```bash
pnpm exec playwright test e2e/scroll-to-top.spec.ts --project=chromium
```

Expected: both tests **FAIL** — `page.getByTestId("scroll-to-top-button")` never resolves because the element doesn't exist yet (times out waiting for `toHaveAttribute`).

- [ ] **Step 3: Commit the failing test**

```bash
git add apps/storefront/e2e/scroll-to-top.spec.ts
git commit -m "DYLLU-000 Add failing e2e test for scroll-to-top button"
```

---

### Task 2: Implement the ScrollToTopButton component

**Files:**

- Create: `apps/storefront/src/components/molecules/scroll-to-top-button.tsx`
- Modify: `apps/storefront/src/app/layout.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import * as React from "react";
import { ChevronUp } from "lucide-react";
import { useLenis } from "lenis/react";

import { cn } from "@lib/utils";
import { Button } from "@/components/atoms/button";

const SCROLL_THRESHOLD_RATIO = 1;

export function ScrollToTopButton() {
  const [visible, setVisible] = React.useState(false);
  const lenis = useLenis();

  React.useEffect(() => {
    let ticking = false;

    const updateVisibility = () => {
      setVisible(window.scrollY > window.innerHeight * SCROLL_THRESHOLD_RATIO);
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateVisibility);
    };

    updateVisibility();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleClick = () => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (lenis) {
      lenis.scrollTo(0, { immediate: prefersReducedMotion });
      return;
    }

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  return (
    <div
      className={cn(
        "small:right-6 small:bottom-6 fixed right-4 bottom-24 z-40 transition-all duration-300",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0"
      )}
    >
      <Button
        variant="brand"
        size="icon"
        onClick={handleClick}
        className="clip-corner-cut-sm clip-shadow-md rounded-none"
        aria-label="Derulează spre început"
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
        data-testid="scroll-to-top-button"
      >
        <ChevronUp />
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Mount it in the root layout**

In `apps/storefront/src/app/layout.tsx`, add the import:

```tsx
import { ScrollToTopButton } from "@/components/molecules/scroll-to-top-button";
```

And render it as a sibling right after `<Toaster />`:

```tsx
        <Toaster richColors closeButton position="top-right" />
        <ScrollToTopButton />
```

- [ ] **Step 3: Run the e2e test to confirm it passes**

Run (from `apps/storefront`):

```bash
pnpm exec playwright test e2e/scroll-to-top.spec.ts --project=chromium
```

Expected: both tests **PASS**.

- [ ] **Step 4: Typecheck and lint**

```bash
pnpm -F @dyllu/storefront typecheck
pnpm -F @dyllu/storefront lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/src/components/molecules/scroll-to-top-button.tsx apps/storefront/src/app/layout.tsx
git commit -m "DYLLU-000 Add cut-corner scroll-to-top button"
```

---

### Task 3: Manual visual QA for collision-free placement

The button's fixed position was chosen to avoid two other floating elements without automated coverage (there's no test asserting pixel-level non-overlap): `FreeShippingPriceNudge` (`fixed right-5 bottom-5 z-10`, appears near the free-shipping threshold) and the mobile sticky add-to-cart bar (`fixed inset-x-0 bottom-0 z-40`, visible below the `small` (1024px) breakpoint on product pages). This task confirms the choice visually; no code changes.

- [ ] **Step 1: Start the dev server**

```bash
pnpm -F @dyllu/storefront dev
```

- [ ] **Step 2: Check desktop placement**

Open `http://localhost:4000`, resize the browser to ≥1024px wide, scroll down past one viewport. Confirm:

- The button appears bottom-right, doesn't overlap the footer content, and uses the lime cut-corner style.
- Clicking it scrolls smoothly to the top.

- [ ] **Step 3: Check mobile/tablet placement against the sticky add-to-cart bar**

Resize the browser to below 1024px wide (e.g. 768px and 390px). From `http://localhost:4000/store`, open any in-stock product page, scroll down past the main add-to-cart controls (the sticky bar appears) and past one viewport height (the scroll-to-top button should also appear). Confirm the two buttons do **not** overlap.

- [ ] **Step 4: Check the free-shipping popup case**

Add a low-priced item to the cart so the free-shipping nudge popup is likely to appear (near, but under, the free-shipping threshold), then scroll down past one viewport on any page. Confirm the scroll-to-top button remains visible and clickable (it renders above the popup, `z-40` vs `z-10`); note in the PR description if any visual overlap with the popup card itself is visible on narrow viewports — this is a known, accepted trade-off per the design spec (the popup is transient/dismissible), not a regression to fix here.

- [ ] **Step 5: Check reduced motion**

In Chrome DevTools → Rendering tab, set "Emulate CSS media feature prefers-reduced-motion: reduce". Scroll down and click the button. Confirm it jumps instantly instead of animating.

- [ ] **Step 6: Stop the dev server**

No commit for this task — it's verification only. If any adjustment is needed, make it now and re-run Task 2's Step 3 e2e test plus this QA task before moving on.

---

### Task 4: Final check and PR

- [ ] **Step 1: Run the full storefront check**

```bash
pnpm -F @dyllu/storefront check
```

Expected: lint, typecheck, and test (full Playwright suite) all pass.

- [ ] **Step 2: Push and open a PR**

```bash
gh auth switch --user abalmush
git push -u origin worktree-scroll-to-top-button
gh pr create --fill --base main
```

- [ ] **Step 3: Merge once checks pass**

Confirm CI is green and the branch is up to date with `main`, then merge (squash) via `gh pr merge --squash --delete-branch`.
