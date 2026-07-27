# Catalog source

`apps/backend/data/ingco/catalog-latest/Dyllu Full range price MDL.csv` is the
only source for product facts:

- SKU, product name, description and specifications
- included items, batteries, chargers and packaging
- price, stock, discount and gift flags

Build the Medusa projection:

```bash
pnpm catalog:build
```

Preview the database update:

```bash
pnpm --dir apps/backend exec medusa exec \
  ./src/scripts/dyllu-sync-catalog-details.ts \
  source=../../outputs/catalog-latest.medusa.json \
  dryRun=true
```

Apply the complete projection to the local Medusa database:

```bash
pnpm catalog:sync:local
```

The command always previews first and refuses non-local or production
databases. Medusa variants absent from the CSV are reported and left unchanged;
all matching variants are replaced with CSV-derived facts.

The generated JSON is a projection, not an editable source. Images and taxonomy
remain Medusa relationships keyed by the CSV SKU.

Audit included component SKUs against the CSV and image manifest:

```bash
python3 tools/audit_catalog_components.py
```

The storefront renders every included battery or charger from the CSV. When a
referenced SKU has no Medusa product image, it renders a typed SKU card instead
of silently dropping the component.
