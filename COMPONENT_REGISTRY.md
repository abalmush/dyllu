# COMPONENT_REGISTRY

Reusable UI in the **storefront** design system and feature modules. Reuse from
here (and `@medusajs/ui`) before creating new primitives — a house rule
([CODING_CONVENTIONS](CODING_CONVENTIONS.md)). catalog-admin has its own separate
shadcn set under `apps/catalog-admin/src/components/ui/`.

## Organization & conventions

Atomic design under `apps/storefront/src/components/`, each layer barrel-exported
via `index.ts`:

```
atoms/       primitives (dumb, domain-agnostic)     → import from "@/components/atoms"
molecules/   small compositions of atoms            → "@/components/molecules"
organisms/   full page sections (may fetch nothing; get data as props)
templates/   page-level layout composition
```

Feature-specific components live in `apps/storefront/src/modules/<feature>/components/`.

- **Styling variants** use `class-variance-authority` (`cva`) + `VariantProps`;
  className merge via `cn()` (`lib/utils.ts`, tailwind-merge). Class order is managed
  by `prettier-plugin-tailwindcss`.
- Primitives are `forwardRef` and spread native element props (e.g. `ButtonProps =
ButtonHTMLAttributes & VariantProps & { … }`).
- Server Components by default; interactivity is pushed to small `"use client"`
  leaves. Prefer composition over boolean-prop proliferation
  ([vercel-composition-patterns] skill).
- Many Radix primitives back the atoms (dialog, tabs, tooltip, navigation-menu,
  radio-group, scroll-area, dropdown-menu, popover, accordion).

## Atoms — `components/atoms/`

Primitives; each exports the component plus (where variant-driven) a `*Props` type
and a `*Variants` cva. Import: `@/components/atoms`.

| Component                                                         | Notes / API                                                                                     |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `Button`                                                          | `cva` variants + `size`; `ButtonProps` extends button attrs; `forwardRef`; `asChild`-style slot |
| `IconButton`                                                      | Icon-only button variant                                                                        |
| `Heading` / `Text`                                                | Typographic scale via `cva` (`HeadingProps`, variant + `as`)                                    |
| `Container`                                                       | Max-width page gutter wrapper (`forwardRef`)                                                    |
| `Card`                                                            | Surface container                                                                               |
| `Badge`                                                           | Status/label chip (atom-level)                                                                  |
| `Price`                                                           | Formatted price display                                                                         |
| `Input`, `Label`, `Checkbox`, `RadioGroup`                        | Form primitives (Radix-backed)                                                                  |
| `Dialog`, `Sheet`, `Tooltip`, `DropdownMenu`, `Accordion`, `Tabs` | Radix overlays/disclosure                                                                       |
| `NavigationMenu`                                                  | Radix navigation menu (mega-menu backbone)                                                      |
| `Command`                                                         | `cmdk` command palette primitive                                                                |
| `Carousel`                                                        | Embla-based carousel primitive                                                                  |
| `ScrollArea`, `Separator`, `Table`, `Skeleton`                    | Layout/utility primitives                                                                       |
| `Logo`                                                            | Brand mark                                                                                      |
| `Sonner`                                                          | Toast provider (`sonner`)                                                                       |
| `CutBorder`, `SmoothScrollProvider`                               | Decorative border; Lenis smooth-scroll wrapper                                                  |

## Molecules — `components/molecules/`

Compositions of atoms; domain-neutral. Import: `@/components/molecules`.

| Component                   | Purpose                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `ProductCard`               | Product tile (`ProductCardProps`: image, title, price, href…) — used across rails/PLP/home |
| `PriceBlock`                | Price with compare-at / discount presentation                                              |
| `CategoryCard`              | Category tile                                                                              |
| `BannerCard`                | Promo banner card (basis of homepage promo mosaic; see `PromoCardData`)                    |
| `PageHero`                  | Section hero; `PageHeroSurface = "default"\|"dark"\|"lime"`, optional stat items           |
| `SectionHeading`, `Eyebrow` | Section titling                                                                            |
| `FeatureStat`               | Single stat/trust figure                                                                   |
| `Breadcrumbs`               | Breadcrumb trail                                                                           |
| `NavLink`                   | Styled nav link                                                                            |
| `NewsletterForm`            | Email capture form                                                                         |
| `QuantityStepper`           | +/- quantity control                                                                       |
| `Badge` (molecule)          | Richer badge composition                                                                   |

## Organisms — `components/organisms/`

Full page sections. Data comes in as props (they don't fetch). Highlights:

- **Site chrome:** `SiteHeader`, `SiteFooter`, `AnnouncementBar`, `UtilityBar`,
  `MegaMenu`, `MobileNav`, `SearchCommand`.
- **Homepage sections:** `PromoMosaic`, `PromoHero`, `PromoBanner*`,
  `ToolFamiliesStrip`, `TrustBand`, `AnatomyShowcase`, `GuidesGrid`,
  `CustomerProjects`, `CustomerTestimonials`, `NewsletterBand`,
  `ProductRailSection`, `ProductSpotlight`, `BrandStrip`, `CategoryMosaic*`,
  `CategoryMarquee`, `CategoryCinematic`, `SystemsGrid`. (Rendered via the block
  switch in `templates/homepage-renderer.tsx`.)
- **PDP:** `PdpHero`, `PdpHeroShell`, `PdpHeroVariants`, `PdpHeroCombo`,
  `ProductSpecs`, `ProductConfidence`, `ProductReviews`, `ProductTypeBadge`,
  `SetBreakdown`, `LinkedProducts`, `ProductRailSection`.
- **PLP / store:** `PlpFilters`, `PlpToolbar`, `PlpProductCard`.
- **Cart / checkout:** `CartDrawer`, `CartLineItem`, `CartSummary`, `EmptyState`,
  `CheckoutAddressForm`, `CheckoutBlocks`, `CheckoutIntelligence`,
  `CheckoutCopilot`, `DecisionCenter`, `DeliveryTrust`, `PurchaseTrustGrid`.
- **Misc marketing:** `BudgetSlider`, `ProjectWorkspace`, `TrustBand`,
  `PromoTileBand`, `CornerCutV2Showcase`, `CategoryMosaicReveal`.

> No carousels/sliders as a _content pattern_ on the storefront — a hard design
> rule (see memory `feedback_no_dated_design`); the `Carousel` atom exists but
> content sections favor grids/rails.

## Templates — `components/templates/`

| Template           | Purpose                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `HomeTemplate`     | Home page shell                                                                                                                                                    |
| `HomepageRenderer` | Maps `HomepageBlock[]` → organisms (single switch). Data-driven homepage engine; block schema in `lib/homepage/types.ts`, content in `lib/homepage/home.config.ts` |
| `InfoPageTemplate` | Static info pages (livrare, termeni, confidentialitate, returnari…)                                                                                                |
| `PreviewTemplate`  | `/preview` internal component gallery (PDP type taxonomy work)                                                                                                     |

## Feature-module components — `src/modules/<feature>/components/`

Domain UI + presentation logic, grouped by feature. Key ones:

| Module                                            | Notable components / logic                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `products`                                        | `product-actions/*` (option/config select, mobile actions, power-supply status), `image-gallery`, `product-tabs`, `related-products`, `compatible-accessories`, `included-accessory-overlay`, `product-price`, `thumbnail`; **`lib/product-presentation.ts`** (UI-type + spec/variant derivation); templates: `kit`/`set`/`combo`/`shared`/`variant-product-stage` |
| `cart`                                            | `item`, `cart-item-select`, `empty-cart-message`, `sign-in-prompt`; templates `items`/`summary`/`preview`                                                                                                                                                                                                                                                          |
| `checkout`                                        | `addresses`, `shipping`, `payment*`, `review`, `discount-code`, `submit-button`, `country-select`; `lib/presentation.ts`; templates `checkout-form`/`checkout-summary`                                                                                                                                                                                             |
| `order`                                           | `order-details`, `order-summary`, `payment-details`, `shipping-details`, `transfer-actions/image`, `help`, `onboarding-cta`; templates `order-completed`/`order-details`                                                                                                                                                                                           |
| `account`                                         | `login`, `register`, `overview`, `address-book`, `profile-*`, `account-nav`, `transfer-request-form`; templates `account-layout`/`login-template`                                                                                                                                                                                                                  |
| `store`                                           | `plp-shell`, `infinite-products-grid`, `refinement-list` (+ `sort-products`), `pagination`; `lib/{product-feed,product-feed-contract,to-plp-product}.ts`                                                                                                                                                                                                           |
| `common`                                          | Shared bits: `input`, `checkbox`, `radio`, `native-select`, `modal`, `cart-totals`, `line-item-*`, `localized-client-link`, `delete-button`, `divider`, `interactive-link`; `icons/*`                                                                                                                                                                              |
| `skeletons`                                       | Loading skeletons per surface (cart, order, product grid, related products…)                                                                                                                                                                                                                                                                                       |
| `categories`, `collections`, `layout`, `shipping` | Category/collection templates; `cart-mismatch-banner`; `free-shipping-price-nudge`                                                                                                                                                                                                                                                                                 |

## Usage recommendations

- Build pages by composing **organisms** inside **templates**; feed them data
  fetched in the route's Server Component via `lib/data/*`.
- Need a variant of an existing primitive? Add a `cva` variant, don't fork the file
  or add a boolean prop chain.
- New homepage section → add a block type in `lib/homepage/types.ts`, an organism,
  a `case` in `HomepageRenderer`, and content in `home.config.ts` (four files — see
  [AI_CONTEXT](AI_CONTEXT.md) “files modified together”).
- PDP variations belong in `modules/products/templates/*` keyed off
  `getProductUiType`; don't branch inside a single template.
- Keep `"use client"` at the leaf. Icons live in `modules/common/icons/` and
  `lucide-react`.
