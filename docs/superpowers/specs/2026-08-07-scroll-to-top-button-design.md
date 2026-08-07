# Scroll-to-top button — design

## Problem

The storefront has no "scroll to top" affordance, a standard pattern on
long-scroll e-commerce pages (collections, PDPs). Users must manually scroll
back up.

## Scope

Site-wide, added once in the root layout. Not page-specific.

## Behavior

- **Trigger:** `window.scrollY` threshold, throttled via
  `requestAnimationFrame`, passive scroll listener. Button appears once the
  user has scrolled past ~1 viewport height (`window.innerHeight`), hides
  when scrolled back above it.
- **Action:** `onClick` calls `window.scrollTo({ top: 0, behavior })`, where
  `behavior` is `"auto"` if `prefers-reduced-motion: reduce` is set,
  otherwise `"smooth"`.

This differs from the codebase's usual `useIntersection` (IntersectionObserver)
hook, which is element-relative and used for per-component visibility (e.g.
mobile sticky add-to-cart bar tied to the real action bar leaving view). A
global "has the user scrolled past N px" threshold is a plain scroll listener
— the standard idiom for this exact pattern, and there's no natural sentinel
element to observe across every route.

## Component

New file: `src/components/molecules/scroll-to-top-button.tsx` — a
self-contained client component (`"use client"`), no props. Mounted once in
`src/app/[countryCode]/layout.tsx` alongside the header/footer.

## Visual style

Matches the existing cut-corner design language (`src/styles/globals.css`,
`clip-corner-cut-*` utilities) rather than the ad-hoc rounded style used by
`FreeShippingPopup`'s dismiss button:

- `size-11` square icon button
- `clip-corner-cut-sm clip-shadow-md rounded-none`
- `variant="brand"` (`bg-primary`/lime + `text-primary-foreground`), same
  variant as the PDP "Adaugă" add-to-cart button
- `ChevronUp` icon from `lucide-react`
- `hover:bg-primary/90 active:scale-[0.98]`, matching the `Button` atom's
  existing interaction conventions
- `focus-visible` ring for keyboard users, `aria-label="Derulează sus"`
  (storefront copy is Romanian — check an existing string for the exact
  convention/casing before hardcoding)

## Transition

Fade + slide, same idiom as `FreeShippingPopup`:

- Hidden: `opacity-0 translate-y-2 pointer-events-none`
- Visible: `opacity-100 translate-y-0`
- `transition-all duration-300`

## Placement & collision handling

`fixed bottom-6 right-4 sm:right-6 z-40`.

Two existing floating elements share bottom-right screen space:

- `FreeShippingPopup` (`fixed right-5 bottom-5 z-10`)
- The mobile PDP sticky add-to-cart bar (`fixed inset-x-0 bottom-0 z-40`,
  full-width, `small:hidden` above the `small` breakpoint)

The button's exact bottom offset will be tuned during implementation and
checked visually (dev server) against both, rather than guessed here. Target:
never visually overlap either at common viewport sizes. If a clean offset
isn't achievable for the mobile sticky-bar case, fall back to hiding the
scroll-to-top button while the sticky add-to-cart bar is visible (same
`useIntersection`-driven `show` flag pattern) rather than stacking on top of
it — this is one plausible outcome, decided during implementation.

## Accessibility

- `aria-label` on the button (icon-only, no visible text)
- Respects `prefers-reduced-motion` for the scroll animation
- Visible focus ring, reachable via keyboard tab order
- `pointer-events-none` while hidden so it never intercepts clicks/taps in
  the corner when invisible

## Out of scope

- No configurability (threshold, position) — single hardcoded global
  instance
- No page-specific opt-out
- No analytics/tracking on click
