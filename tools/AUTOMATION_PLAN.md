# Ecommerce automation roadmap

Tools to build that automate manual work across the DYLLU storefront. Pattern: anywhere we do something *per product* by hand is a candidate — those tasks scale linearly with catalog size and dominate ongoing operational cost.

Status: planning. Image tools (`tools/images/`) already shipped; everything below is a future build.

## Build order recommendation

1. Product copy generator (high ROI, ~1 day)
2. Multi-format social pack generator (extends image tools)
3. Structured data + sitemap (one-time SEO setup, compounds forever)
4. Translation pipeline (regional must-have for Moldova)
5. Lifestyle scene composer (creative production speedup)
6. Everything else as catalog grows

---

## High leverage

### 1. Product copy generator
**Path:** `tools/copy/generate.py`
**Effort:** ~1 day
**Stack:** Python + Claude API

Feed a photo + minimal SKU data → returns a copy bundle:
- Title (Romanian + Russian)
- Short description (cart card, ~80 chars)
- Long description (PDP, 2–3 paragraphs)
- 3–5 bullet points (specs)
- SEO meta title (60 chars) + meta description (155 chars)
- Alt text for accessibility
- 5–10 keywords for tagging

Cost: ~2¢/product. 500-product catalog = $10 vs. ~50 hours of manual writing. Often pays for the entire tooling effort by itself.

Inputs: YAML/JSON file with `{ sku, photo_path, brand, basic_specs }`. Outputs: JSON copy bundle that can be imported directly into Medusa.

### 2. Multi-format social pack generator
**Path:** `tools/social/pack.py`
**Effort:** ~half day
**Stack:** Python + extends existing `tools/images/scripts/demo.py`

One source image + product data → outputs:
- 1:1 (Instagram feed)
- 9:16 (Stories / Reels / TikTok)
- 4:5 (IG vertical)
- 16:9 (Facebook / Twitter)

Each format gets platform-appropriate text + CTA overlay. Eliminates the manual export-and-resize loop in Figma/Photoshop.

### 3. Structured data + sitemap
**Path:** Next.js app-level (not a tools/ CLI)
**Effort:** ~half day
**Stack:** Next.js metadata API + JSON-LD generator helpers

App-level emit of:
- `Product` schema (price, availability, brand, SKU, reviews when present)
- `BreadcrumbList` schema for category navigation
- `Organization` schema once
- `FAQ` schema for product Q&A blocks
- `WebSite` schema with search action

Plus auto-built `sitemap.xml` with priority weighting (homepage > category > product) and `lastmod` from Medusa update timestamps.

Hard SEO win — Google needs these to surface rich results (stars, price, availability badges in SERPs).

## Medium leverage

### 4. Translation pipeline
**Path:** `tools/copy/translate.py`
**Effort:** ~half day
**Stack:** Python + Claude API + glossary file

Romanian ↔ Russian for product copy, order confirmation emails, UI strings. Moldova is officially bilingual; Russian-speaking customers are a real segment.

Glossary file pins technical-term translations (so "burghie" maps consistently across the site instead of drifting per call).

### 5. Lifestyle scene composer
**Path:** Extends `tools/images/`
**Effort:** ~1 day (script + initial scene library)

Pre-built scene templates (workshop, garage, kitchen, garden) where the script drops a transparent product PNG with proper shadow/lighting via PIL. One source photo → 4 contextual shots.

Use cases: category headers, ads, blog posts, social, banner rotation.

Depends on bg-remove tool (already shipped).

### 6. Social poster
**Path:** `tools/social/post.py`
**Effort:** ~half day
**Stack:** Python + Meta Graph API

Posts to Facebook + Instagram automatically — new product → post with image + copy + link.

Triggers: cron schedule, or webhook from Medusa `product.created` event. Requires Meta business app setup with `pages_manage_posts` + `instagram_content_publish` scopes.

## Lower urgency

### 7. Review summarizer
**Path:** `tools/reviews/summarize.py`
**Effort:** ~few hours
**Stack:** Python + Claude API + cron

Once reviews exist: condenses 50+ reviews into "What pros loved" / "Common complaints" / "Best for" summary blocks. Drop on PDP. Updates weekly.

### 8. Spec extractor
**Path:** `tools/copy/extract-specs.py`
**Effort:** ~few hours
**Stack:** Python + Claude API (vision)

Manufacturer PDF datasheet → structured JSON of specs (voltage, RPM, weight, dimensions, included accessories). Pipes into Medusa product attributes.

Big time-saver when onboarding a new manufacturer with a 200-product PDF catalog.

### 9. Compatibility matrix builder
**Path:** Next.js app-level + Medusa attribute model
**Effort:** ~1 day

DYLLU-specific: "which battery fits which tool" / "which charger powers which series". Auto-built from product attributes, displayed as an interactive table on PDPs.

Conversion win for tool buyers — most common pre-purchase question for cordless ranges.

### 10. Email template generator
**Path:** `tools/email/templates.py`
**Effort:** ~half day
**Stack:** Python + MJML or React Email

"Back in stock" / "Price drop" / "Cart abandonment" / "Order confirmation" — one generator that pulls product image + copy and produces HTML email body. Outputs ready for SendGrid / Resend / Mailgun ingest.

### 11. Competitor price scraper
**Path:** `tools/intel/prices.py`
**Effort:** ~1 day
**Stack:** Python + Playwright (for JS-rendered competitor sites)

Scrapes defined competitor list weekly, builds CSV of where DYLLU is priced above/below. Useful for promo planning.

**Caution:** mind competitors' robots.txt and ToS. Throttle aggressively. Don't republish competitor data — internal use only.

### 12. Stock & velocity intelligence
**Path:** `tools/intel/stock.py` + dashboard route
**Effort:** ~1 day

Pulls Medusa inventory + order history → reorder suggestions, low-stock alerts, slow-mover flags, bundle recommendations based on co-purchase patterns.

## Cross-cutting infrastructure

These aren't standalone tools but support multiple of the above:

- **Anthropic API key management** — single `.env` at repo root, scripts read from there. Never commit.
- **Medusa client wrapper** — shared Python/TS module that talks to the Medusa admin API with auth, used by copy generator, spec extractor, social poster, etc.
- **Output convention** — all tools land artifacts in `tools/<name>/output/`, gitignored. Manual review step before promotion to `apps/storefront/public/` or Medusa.
- **Cron / scheduler** — picking one consistent runner (GitHub Actions cron, Coolify cron, or Vercel cron) for the recurring tools (#7, #11, #12).

## What's intentionally not here

- Customer-facing chatbot. Worth doing eventually but needs careful brand voice work and legal review (refund policy, etc.); not a "just script it" task.
- Generative product photography (Stable Diffusion etc.) — quality is inconsistent for technical products like power tools where every detail matters. Real product photos still win.
- Auto-pricing / dynamic pricing. Margins are too tight in hardware retail to let an algorithm experiment freely.
