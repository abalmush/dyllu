# Phase 0 — Consolidate to `catalog_master.json` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the four scattered scraper data files into a single, resumable `catalog_master.json` keyed by SKU, with per-phase approval scaffolding, as the foundation for all later catalog phases.

**Architecture:** A new pure-Python module `tools/scraper/catalog.py` with small, testable functions: a per-SKU merge, a group index, an idempotent master builder that preserves existing approval state and curated fields, and a stats summary. A thin CLI writes `data/catalog_master.json` atomically via the existing `write_json_atomic` helper.

**Tech Stack:** Python 3, pytest 8.3.5. Runs from `tools/scraper/`. No new dependencies.

---

## Context for the implementer

- Work happens in `tools/scraper/`. Run all commands from that directory.
- Tests live in `tools/scraper/tests/` and import modules directly (e.g. `from catalog import build_master`). Run with `python3 -m pytest tests/... -v`.
- Existing helper: `scrape.write_json_atomic(obj, path)` writes JSON (`ensure_ascii=False, indent=2`) atomically.
- Input files (all under `tools/scraper/data/`):
  - `products_enriched.json` — list of 888 products. Keys used: `sku, name, name_ro, name_en, product_type, function_en, variant_key, power_source, correct_category, category_path, price_mdl, group_id_ai, group_name_en, image_url`.
  - `togroup/product_details.json` — dict keyed by SKU. Keys used: `description` (list), `images` (list), `has_video` (bool), `category_breadcrumb` (list).
  - `images/manifest.json` — dict keyed by SKU. Keys used: `file`, `source`.
  - `groups.json` — list of groups, each with `group_id`, `group_name`, `variants` (list of `{sku, ...}`).
- **Idempotency requirement:** re-running the build refreshes `source` from the inputs but PRESERVES `phases` (approval state) and any curated keys later phases add. This is what makes the pipeline safe to re-run (e.g. after the 61 login-gated togroup fetches land — see `data/togroup/RESUME.md`; that fetch is a separate manual step, not part of this plan).

## File structure

- Create: `tools/scraper/catalog.py` — the consolidation module + CLI.
- Create: `tools/scraper/tests/test_catalog.py` — unit tests.
- Produces at runtime: `tools/scraper/data/catalog_master.json` (not committed; it is generated data).

### Master record schema (per SKU)

```json
{
  "sku": "DTGM2552",
  "source": {
    "name": "…",
    "name_ro": "…",
    "name_en": "…",
    "product_type": "…",
    "function_en": "…",
    "variant_key": "…",
    "power_source": "…",
    "correct_category": "…",
    "category_path": ["…"],
    "price_mdl": 1799.0,
    "group_id_ai": "…",
    "group_name_en": "…",
    "image_url": "https://…",
    "togroup": {
      "description": ["…"],
      "images": ["…"],
      "has_video": false,
      "category_breadcrumb": ["…"]
    },
    "image": { "file": "DTGM2552.jpg", "source": "togroup" },
    "group": { "group_id": "…", "group_name": "…" }
  },
  "phases": {
    "grouping": { "status": "pending" },
    "images": { "status": "pending" },
    "descriptions": { "status": "pending" },
    "links": { "status": "pending" }
  }
}
```

---

## Task 1: Phase constants and initializer

**Files:**

- Create: `tools/scraper/catalog.py`
- Test: `tools/scraper/tests/test_catalog.py`

- [ ] **Step 1: Write the failing test**

```python
# tools/scraper/tests/test_catalog.py
from catalog import PHASES, init_phases


def test_phases_are_the_four_pipeline_stages():
    assert PHASES == ["grouping", "images", "descriptions", "links"]


def test_init_phases_all_pending():
    phases = init_phases()
    assert set(phases) == set(PHASES)
    assert all(phases[p] == {"status": "pending"} for p in PHASES)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m pytest tests/test_catalog.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'catalog'`

- [ ] **Step 3: Write minimal implementation**

```python
# tools/scraper/catalog.py
import json
from pathlib import Path

from scrape import write_json_atomic

PHASES = ["grouping", "images", "descriptions", "links"]


def init_phases():
    return {phase: {"status": "pending"} for phase in PHASES}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m pytest tests/test_catalog.py -v`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add tools/scraper/catalog.py tools/scraper/tests/test_catalog.py
git commit -m "feat(scraper): add catalog phase constants and initializer

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Merge a single SKU across sources

**Files:**

- Modify: `tools/scraper/catalog.py`
- Test: `tools/scraper/tests/test_catalog.py`

- [ ] **Step 1: Write the failing test**

```python
# add to tools/scraper/tests/test_catalog.py
from catalog import merge_record


def test_merge_record_full():
    enriched = {
        "sku": "DTGM2552", "name": "Trimer 52cc DYLLU DTGM2552",
        "name_ro": "Motocoasă 52cc", "name_en": "Petrol Grass Trimmer 52cc",
        "product_type": "petrol_grass_trimmer", "function_en": "Cuts grass",
        "variant_key": "52cc", "power_source": "petrol",
        "correct_category": "Grădinărit", "category_path": ["Grădinărit"],
        "price_mdl": 1799.0, "group_id_ai": "g1", "group_name_en": "Trimmer",
        "image_url": "https://ing/DTGM2552.webp",
    }
    togroup = {"description": ["Displacement:52cc"], "images": ["a.jpg"],
               "has_video": True, "category_breadcrumb": ["All", "Garden"]}
    manifest = {"file": "DTGM2552.jpg", "source": "togroup"}
    group = {"group_id": "grp9", "group_name": "Petrol Trimmers"}

    rec = merge_record(enriched, togroup, manifest, group)

    assert rec["sku"] == "DTGM2552"
    assert rec["source"]["name_en"] == "Petrol Grass Trimmer 52cc"
    assert rec["source"]["price_mdl"] == 1799.0
    assert rec["source"]["togroup"]["description"] == ["Displacement:52cc"]
    assert rec["source"]["togroup"]["has_video"] is True
    assert rec["source"]["image"] == {"file": "DTGM2552.jpg", "source": "togroup"}
    assert rec["source"]["group"] == {"group_id": "grp9", "group_name": "Petrol Trimmers"}
    assert rec["phases"]["descriptions"] == {"status": "pending"}


def test_merge_record_missing_sources_use_safe_defaults():
    enriched = {"sku": "DTXX0001", "name": "Widget"}
    rec = merge_record(enriched, {}, {}, {})
    assert rec["sku"] == "DTXX0001"
    assert rec["source"]["category_path"] == []
    assert rec["source"]["togroup"] == {
        "description": [], "images": [], "has_video": False, "category_breadcrumb": []}
    assert rec["source"]["image"] == {"file": None, "source": None}
    assert rec["source"]["group"] == {"group_id": None, "group_name": None}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m pytest tests/test_catalog.py -v`
Expected: FAIL with `ImportError: cannot import name 'merge_record'`

- [ ] **Step 3: Write minimal implementation**

```python
# add to tools/scraper/catalog.py
def merge_record(enriched, togroup, manifest, group):
    return {
        "sku": enriched["sku"],
        "source": {
            "name": enriched.get("name"),
            "name_ro": enriched.get("name_ro"),
            "name_en": enriched.get("name_en"),
            "product_type": enriched.get("product_type"),
            "function_en": enriched.get("function_en"),
            "variant_key": enriched.get("variant_key"),
            "power_source": enriched.get("power_source"),
            "correct_category": enriched.get("correct_category"),
            "category_path": enriched.get("category_path") or [],
            "price_mdl": enriched.get("price_mdl"),
            "group_id_ai": enriched.get("group_id_ai"),
            "group_name_en": enriched.get("group_name_en"),
            "image_url": enriched.get("image_url"),
            "togroup": {
                "description": togroup.get("description") or [],
                "images": togroup.get("images") or [],
                "has_video": bool(togroup.get("has_video")),
                "category_breadcrumb": togroup.get("category_breadcrumb") or [],
            },
            "image": {
                "file": manifest.get("file"),
                "source": manifest.get("source"),
            },
            "group": {
                "group_id": group.get("group_id"),
                "group_name": group.get("group_name"),
            },
        },
        "phases": init_phases(),
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m pytest tests/test_catalog.py -v`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add tools/scraper/catalog.py tools/scraper/tests/test_catalog.py
git commit -m "feat(scraper): merge a single SKU across all data sources

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Group index and master builder

**Files:**

- Modify: `tools/scraper/catalog.py`
- Test: `tools/scraper/tests/test_catalog.py`

- [ ] **Step 1: Write the failing test**

```python
# add to tools/scraper/tests/test_catalog.py
import json
from catalog import index_groups, build_master


def test_index_groups_maps_sku_to_group():
    groups = [
        {"group_id": "g1", "group_name": "Drills",
         "variants": [{"sku": "A1"}, {"sku": "A2"}]},
        {"group_id": "g2", "group_name": "Saws", "variants": [{"sku": "B1"}]},
    ]
    idx = index_groups(groups)
    assert idx["A2"] == {"group_id": "g1", "group_name": "Drills"}
    assert idx["B1"] == {"group_id": "g2", "group_name": "Saws"}


def _seed_data_dir(data_dir):
    (data_dir / "products_enriched.json").write_text(json.dumps([
        {"sku": "A1", "name": "Drill A1", "name_en": "Drill", "category_path": ["Tools"]},
        {"sku": "A2", "name": "Drill A2", "name_en": "Drill", "category_path": ["Tools"]},
    ]))
    (data_dir / "togroup").mkdir()
    (data_dir / "togroup" / "product_details.json").write_text(json.dumps({
        "A1": {"description": ["18V"], "has_video": True},
    }))
    (data_dir / "images").mkdir()
    (data_dir / "images" / "manifest.json").write_text(json.dumps({
        "A1": {"file": "A1.jpg", "source": "togroup"},
        "A2": {"file": "A2.webp", "source": "ingcomoldova"},
    }))
    (data_dir / "groups.json").write_text(json.dumps([
        {"group_id": "g1", "group_name": "Drills", "variants": [{"sku": "A1"}, {"sku": "A2"}]},
    ]))


def test_build_master_keys_by_sku_and_joins(tmp_path):
    _seed_data_dir(tmp_path)
    master = build_master(tmp_path)
    assert set(master) == {"A1", "A2"}
    assert master["A1"]["source"]["togroup"]["description"] == ["18V"]
    assert master["A1"]["source"]["image"]["source"] == "togroup"
    assert master["A2"]["source"]["image"]["source"] == "ingcomoldova"
    assert master["A1"]["source"]["group"]["group_name"] == "Drills"
    assert master["A2"]["phases"] == {p: {"status": "pending"}
                                      for p in ["grouping", "images", "descriptions", "links"]}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m pytest tests/test_catalog.py -v`
Expected: FAIL with `ImportError: cannot import name 'index_groups'`

- [ ] **Step 3: Write minimal implementation**

```python
# add to tools/scraper/catalog.py
def index_groups(groups):
    by_sku = {}
    for group in groups:
        for variant in group.get("variants", []):
            sku = variant.get("sku")
            if sku:
                by_sku[sku] = {
                    "group_id": group.get("group_id"),
                    "group_name": group.get("group_name"),
                }
    return by_sku


def _read_json(path, default):
    return json.loads(path.read_text()) if path.exists() else default


def build_master(data_dir, existing=None):
    existing = existing or {}
    enriched = _read_json(data_dir / "products_enriched.json", [])
    togroup = _read_json(data_dir / "togroup" / "product_details.json", {})
    manifest = _read_json(data_dir / "images" / "manifest.json", {})
    groups = _read_json(data_dir / "groups.json", [])
    groups_by_sku = index_groups(groups)

    master = {}
    for product in enriched:
        sku = product["sku"]
        record = merge_record(
            product,
            togroup.get(sku, {}),
            manifest.get(sku, {}),
            groups_by_sku.get(sku, {}),
        )
        _carry_over(record, existing.get(sku))
        master[sku] = record
    return master


def _carry_over(record, previous):
    if not previous:
        return
    merged_phases = init_phases()
    merged_phases.update(previous.get("phases", {}))
    record["phases"] = merged_phases
    for key, value in previous.items():
        if key not in ("sku", "source", "phases"):
            record[key] = value
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m pytest tests/test_catalog.py -v`
Expected: PASS (7 passed)

- [ ] **Step 5: Commit**

```bash
git add tools/scraper/catalog.py tools/scraper/tests/test_catalog.py
git commit -m "feat(scraper): build SKU-keyed catalog master from all sources

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Idempotency — preserve approvals and curated fields on re-run

**Files:**

- Test: `tools/scraper/tests/test_catalog.py` (behavior already implemented in Task 3 via `_carry_over`; this task locks it with tests)

- [ ] **Step 1: Write the failing test**

```python
# add to tools/scraper/tests/test_catalog.py
def test_build_master_preserves_prior_phase_state_and_curated_fields(tmp_path):
    _seed_data_dir(tmp_path)
    existing = {
        "A1": {
            "sku": "A1",
            "source": {"name": "STALE — must be refreshed"},
            "phases": {"grouping": {"status": "approved"}},
            "specifications": ["carried over"],
        }
    }
    master = build_master(tmp_path, existing=existing)
    # curated field preserved
    assert master["A1"]["specifications"] == ["carried over"]
    # approval preserved
    assert master["A1"]["phases"]["grouping"]["status"] == "approved"
    # new/other phases still defaulted
    assert master["A1"]["phases"]["descriptions"] == {"status": "pending"}
    # source refreshed from inputs, not the stale existing value
    assert master["A1"]["source"]["name"] == "Drill A1"
    # a SKU with no prior state is untouched
    assert master["A2"]["phases"]["grouping"] == {"status": "pending"}
```

- [ ] **Step 2: Run test to verify it passes immediately**

Run: `python3 -m pytest tests/test_catalog.py::test_build_master_preserves_prior_phase_state_and_curated_fields -v`
Expected: PASS (the `_carry_over` logic from Task 3 already satisfies this). If it FAILS, fix `_carry_over` so that: (a) `source` always comes from the fresh merge, (b) `phases` start from `init_phases()` then overlay `previous["phases"]`, (c) any other top-level key in `previous` is copied onto the record.

- [ ] **Step 3: Run the full test file**

Run: `python3 -m pytest tests/test_catalog.py -v`
Expected: PASS (8 passed)

- [ ] **Step 4: Commit**

```bash
git add tools/scraper/tests/test_catalog.py
git commit -m "test(scraper): lock idempotent carry-over of approvals and edits

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Stats summary

**Files:**

- Modify: `tools/scraper/catalog.py`
- Test: `tools/scraper/tests/test_catalog.py`

- [ ] **Step 1: Write the failing test**

```python
# add to tools/scraper/tests/test_catalog.py
from catalog import catalog_stats


def test_catalog_stats_counts(tmp_path):
    _seed_data_dir(tmp_path)
    stats = catalog_stats(build_master(tmp_path))
    assert stats["total"] == 2
    assert stats["with_togroup_desc"] == 1   # only A1 has description
    assert stats["with_image"] == 2
    assert stats["fallback_image"] == 1      # A2 is ingcomoldova
    assert stats["with_video"] == 1          # only A1
    assert stats["grouped"] == 2             # both in g1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m pytest tests/test_catalog.py -v`
Expected: FAIL with `ImportError: cannot import name 'catalog_stats'`

- [ ] **Step 3: Write minimal implementation**

```python
# add to tools/scraper/catalog.py
def catalog_stats(master):
    def src(record):
        return record["source"]
    return {
        "total": len(master),
        "with_togroup_desc": sum(1 for r in master.values() if src(r)["togroup"]["description"]),
        "with_image": sum(1 for r in master.values() if src(r)["image"]["file"]),
        "fallback_image": sum(1 for r in master.values() if src(r)["image"]["source"] == "ingcomoldova"),
        "with_video": sum(1 for r in master.values() if src(r)["togroup"]["has_video"]),
        "grouped": sum(1 for r in master.values() if src(r)["group"]["group_id"]),
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m pytest tests/test_catalog.py -v`
Expected: PASS (9 passed)

- [ ] **Step 5: Commit**

```bash
git add tools/scraper/catalog.py tools/scraper/tests/test_catalog.py
git commit -m "feat(scraper): add catalog coverage stats

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: CLI entry point

**Files:**

- Modify: `tools/scraper/catalog.py`
- Test: `tools/scraper/tests/test_catalog.py`

- [ ] **Step 1: Write the failing test**

```python
# add to tools/scraper/tests/test_catalog.py
from catalog import run_build


def test_run_build_writes_master_and_is_idempotent(tmp_path):
    _seed_data_dir(tmp_path)
    out = tmp_path / "catalog_master.json"

    stats1 = run_build(tmp_path)
    assert out.exists()
    written = json.loads(out.read_text())
    assert set(written) == {"A1", "A2"}
    assert stats1["total"] == 2

    # simulate an approval, then re-run; approval must survive
    written["A1"]["phases"]["grouping"]["status"] = "approved"
    out.write_text(json.dumps(written))
    run_build(tmp_path)
    reread = json.loads(out.read_text())
    assert reread["A1"]["phases"]["grouping"]["status"] == "approved"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python3 -m pytest tests/test_catalog.py -v`
Expected: FAIL with `ImportError: cannot import name 'run_build'`

- [ ] **Step 3: Write minimal implementation**

```python
# add to tools/scraper/catalog.py
def run_build(data_dir):
    master_path = Path(data_dir) / "catalog_master.json"
    existing = _read_json(master_path, {})
    master = build_master(Path(data_dir), existing=existing)
    write_json_atomic(master, master_path)
    return catalog_stats(master)


def main():
    from config import DATA_DIR
    stats = run_build(DATA_DIR)
    print("catalog_master.json written:")
    for key, value in stats.items():
        print(f"  {key:20} {value}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python3 -m pytest tests/test_catalog.py -v`
Expected: PASS (10 passed)

- [ ] **Step 5: Run the CLI against real data**

Run: `python3 catalog.py`
Expected output (approximately — exact numbers may shift as togroup fetches complete):

```
catalog_master.json written:
  total                888
  with_togroup_desc    814
  with_image           888
  fallback_image       74
  with_video           30
  grouped              <n>
```

Verify the file exists: `ls -la data/catalog_master.json`

- [ ] **Step 6: Run the whole scraper test suite (no regressions)**

Run: `python3 -m pytest -q`
Expected: all tests pass (existing suite + the 10 new catalog tests).

- [ ] **Step 7: Commit**

```bash
git add tools/scraper/catalog.py tools/scraper/tests/test_catalog.py
git commit -m "feat(scraper): add catalog build CLI writing catalog_master.json

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-review notes

- **Spec coverage:** This plan implements the spec's "Phase 0 — Consolidate" and the "one master, idempotent passes" architecture (SKU-keyed master, per-phase approval scaffolding, resumable carry-over). The login-gated 61-fetch is intentionally excluded (manual browser step in `data/togroup/RESUME.md`); the builder is re-runnable so those upgrades flow in on a later `python3 catalog.py`. Later phases (grouping review UI, images, descriptions, links, export) are out of scope for this plan and get their own plans.
- **Field ownership:** `source` holds refreshed raw inputs; later phases add customer-facing (RO) and internal (EN) curated keys at the top level, preserved by `_carry_over`.
- **Naming consistency:** `PHASES`, `init_phases`, `merge_record`, `index_groups`, `build_master`, `_carry_over`, `_read_json`, `catalog_stats`, `run_build`, `main` — used consistently across all tasks.
- **Generated artifact:** `data/catalog_master.json` is generated data and should not be committed (consistent with the other `data/*.json` files being untracked).
