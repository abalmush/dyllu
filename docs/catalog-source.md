# Catalog source

Medusa is the source of truth for the live catalog.

`apps/backend/data/ingco/catalog-latest/Dyllu Full range price MDL.csv` is a
reference used to investigate suspected catalog issues. It must not overwrite
intentional Medusa changes automatically.

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

Apply the projection only to an explicitly selected local Medusa database:

```bash
pnpm catalog:sync:local
```

The command always previews first and refuses non-local or production
databases. Review every proposed difference against Medusa before applying it.
Medusa variants absent from the CSV are reported and left unchanged.

The generated JSON is a diagnostic projection, not an editable source. Images,
taxonomy and current catalog content remain Medusa-owned relationships and
data.

Audit included component SKUs against the CSV and image manifest:

```bash
python3 tools/audit_catalog_components.py
```

Use the audit output to identify mismatches for review. Any correction is made
in Medusa through an approved catalog workflow.
