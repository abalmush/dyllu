# DYLLU Category Tree — Proposal

Two-level taxonomy (root → leaf, no L3) covering all 457 merged INGCO products.
Designed for **intent-driven browsing** — a customer should be able to find a
product by asking "what kind of work am I doing?" without knowing the exact
product name.

Numbers next to each leaf are the **estimated product count** based on the
INGCO breadcrumb tally (`apps/backend/data/ingco/products-merged/`).

## Design principles

- **10 roots, 4–15 leaves each.** Fewer roots = giant dropdowns; more = paralysis.
- **Names in plain Romanian.** No "consumabile", no "echipament". Words a customer would say out loud.
- **Group by intent, not by SKU type.** A pressure washer lives under _Auto & Garaj_ (washing the car), a sprayer pump under _Grădină_ (watering plants), even though both are pumps.
- **Tool boxes and bags consolidated under _Depozitare_** — INGCO scattered them across auto/garaj and gospodărie, customers don't think that way.
- **Battery / charger always under _Accesorii_**, never under the tool root — keeps the bare tool aisle clean.
- **Cross-cutting axes (e.g. "Toate produsele DYLLU 20V", "Cordless vs corded") live as filters, not categories** — those are facets, not aisles.

## The tree

### 1. Scule electrice (Power tools) — ~40 products

Corded and cordless powered hand-tools. Bare tool aisle — batteries live under _Accesorii_.

- Bormașini și mașini de înșurubat (~8) — drills, drivers, impact drivers
- Polizoare unghiulare (~5) — angle grinders
- Fierăstraie (~7) — circular, jigsaw, reciprocating, metal-cutting
- Mașini de șlefuit (~5) — orbital, belt, alternative sanders
- Ciocane rotopercutoare și demolatoare (~6) — rotary + demolition hammers
- Mașini de frezat și gravurat (~4) — routers, engravers
- Pistoale de bătut cuie (~2) — nail guns / staplers
- Fenuri industriale (~3) — heat guns
- Seturi pe acumulator (~3) — cordless combo kits

### 2. Scule manuale (Hand tools) — ~151 products

The biggest root by far. Subdivided aggressively so no leaf goes over ~20 items.

- Chei și seturi (~25) — wrenches, socket sets, ratchets
- Șurubelnițe (~18) — screwdrivers + screwdriver sets
- Clești (~14) — pliers, side cutters
- Ciocane și topoare (~8) — hammers, axes
- Fierăstraie manuale (~8) — hand saws
- Cuțite și lame (~8) — knives, utility blades
- Foarfeci (~5) — metal shears
- Spatule și șpacluri (~6) — scrapers
- Dălți (~3) — chisels
- Menghine (~8) — vises
- Capsatoare și pistoale de nituri (~12) — staplers, rivet guns
- Unelte pentru faianță și gresie (~5) — tile cutters, tile tools
- Instrumente de măsurare (~15) — tape, levels (manual + laser), calipers, telemetry
- Ventuze (~3) — suction cups
- Perii (~4) — wire/cleaning brushes

### 3. Sudură, compresoare și generatoare (Welding, compressors, generators) — ~36 products

- Aparate de sudat (~10) — MMA, TIG, inverter welders
- Compresoare (~5) — workshop compressors
- Pneumatică (~8) — pneumatic tools (impact wrenches, nailers, blow guns)
- Generatoare (~3) — petrol generators
- Accesorii de sudură (~7) — welding masks, electrodes, wire, accessories

### 4. Grădină (Garden) — ~47 products

- Motofierăstraie (~5) — chainsaws + accessories
- Trimmere și cositoare (~10) — trimmers, lawn mowers
- Foarfeci de grădină (~6) — pruners, hedge trimmers (manual + cordless)
- Suflante de frunze (~4) — leaf blowers
- Motocultoare (~5) — tillers, motoblocks, attachments
- Stropitori și pulverizatoare (~3) — sprayers
- Irigare (~10) — irrigation hoses, fittings, accessories
- Unelte de mână pentru grădină (~4) — garden hand tools

### 5. Auto și Garaj (Auto & Garage) — ~25 products

(Tool boxes/bags moved to _Depozitare_.)

- Mașini de spălat cu presiune (~8) — electric + petrol pressure washers + accessories
- Cricuri (~3) — bottle + trolley jacks
- Compresoare auto (~4) — 12V/cordless car compressors
- Mașini de lustruire (~2) — polishers
- Accesorii auto (~6) — car wrenches, chargers, jump tools
- Canistre combustibil (~2) — fuel canisters

### 6. Construcție (Construction) — ~34 products

Heavy-duty equipment and finishing tools — the contractor aisle.

- Betoniere și mixere (~4) — concrete mixers + paddle mixers
- Vibratoare pentru beton (~5) — concrete vibrators
- Compactoare și plăci vibrante (~5) — compactors, plate vibrators
- Elicoptere și rigle vibrante (~3) — power trowels, screeds
- Pulverizatoare și echipament de vopsire (~7) — paint sprayers, rollers, paint kits
- Pistoale pentru construcție (~7) — caulk guns, hot-glue, foam guns
- Aspiratoare industriale (~3) — wet/dry industrial vacuums

Plumbing/sanitary stays separate (in _Casă_) — different customer intent.

### 7. Casă, Iluminat și Pompe (Home, Lighting, Pumps) — ~30 products

- Iluminat (~5) — LED projectors, work lights, headlamps
- Prelungitoare și cabluri electrice (~3) — extension cords, reels
- Multimetre și testere (~6) — multimeters, cable detectors
- Lăcate (~8) — padlocks, bike locks, security
- Aspiratoare casnice (~4) — household + cordless vacuums
- Aparate de curățat cu aburi (~1) — steam cleaners
- Tehnică sanitară (~4) — pipe cutters, polypropylene welders, ventilators
- Arzătoare și aprindere (~2) — gas torches
- Pompe (~8) — water pumps, submersible pumps

### 8. Protecție și Îmbrăcăminte de lucru (PPE & Workwear) — ~24 products

- Mănuși (~7) — work gloves
- Mască și respiratoare (~2) — masks, respirators
- Ochelari de protecție (~3) — safety goggles
- Căști de protecție (~1) — hard hats
- Încălțăminte și haine de lucru (~11) — work boots + clothing

### 9. Accesorii și Consumabile (Accessories & Consumables) — ~54 products

The cross-cutting "stuff you buy with the tool" aisle.

- Acumulatori (~5) — DYLLU 12V / 20V batteries
- Încărcătoare (~4) — chargers + USB cables
- Burghie (~12) — drill bits (metal, wood, concrete SDS)
- Bituri și capete de cheie (~9) — bits, socket adapters
- Lame, pânze și freze (~10) — circular blades, jigsaw blades, milling
- Discuri abrazive (~10) — abrasive discs (metal/wood/concrete), flap discs
- Carote diamantate (~2) — diamond core bits
- Benzi abrazive (~1) — sanding belts
- Cabluri și frânghii (~4) — cable ties, ropes, lifting straps

### 10. Depozitare (Storage) — ~20 products

Includes tool boxes, bags, carts — wherever INGCO put them.

- Cutii pentru scule (~7) — metal + plastic tool boxes
- Genți pentru scule (~8) — tool bags + belts
- Cărucioare și rafturi (~4) — carts, shelving
- Bancuri de lucru (~1) — workbenches

## What changes from today

**Roots:** 7 → 10. Added _Sudură/compresoare/generatoare_, _Auto & Garaj_, _Construcție_, _Casă/Iluminat/Pompe_. Renamed _Accesorii_ → _Accesorii și Consumabile_. Merged _Haine de lucru_ + _Protecție_ → _Protecție și Îmbrăcăminte de lucru_.

**Leaves:** ~14 (only under power tools) → ~95 (across all roots). Roughly matches the INGCO source granularity but regrouped by customer intent.

**Source category map** (`SOURCE_CATEGORY_MAP` in `ingco-ingest-merged.ts`) is replaced by a leaf-level mapper. Every product gets a specific leaf, not just a root.

## Open questions

1. **Battery system browsing.** Customers buying into the DYLLU P20S ecosystem want to see "everything that takes a 20V battery". I'd handle this as a **filter facet** on the leaf pages (using `metadata.platform`), plus a curated landing page (`/sistem-20v`) — _not_ a top-level category. Confirm?

2. **Should _Construcție_ and _Scule electrice_ be merged?** Mixers and demolition hammers are arguably power tools. I kept them separate because the customer intent is different ("I'm building a wall" vs "I need a drill"). Open to changing.

3. **Single-product leaves** (e.g. _Bancuri de lucru_, _Aparate de curățat cu aburi_) — should they be folded into the closest neighbor, or kept as 1-product leaves for discoverability? My default: keep, because empty aisles hint at planned assortment growth.

4. **Project-based shopping** ("renovez baia", "amenajez grădina") — should this exist as a second navigation axis? Could be a separate Phase 2 — useful but not required for the initial cleanup.

## Next step (once approved)

1. Update `apps/backend/src/migration-scripts/initial-data-seed.ts` to seed the full tree.
2. Write `apps/backend/src/scripts/ingco-categorize.ts` — sibling to `ingco-classify.ts`. Idempotent, dry-runnable. Maps each product to a leaf using `breadcrumbs` (primary signal) with `tool_kind` / `accessory_kind` fallback.
3. Drop the hardcoded `apps/storefront/src/lib/data/categories-tree.ts` — storefront uses the DB tree exclusively via `getCategoryTree()`.
