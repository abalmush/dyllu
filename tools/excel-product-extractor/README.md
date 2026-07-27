# Excel product extractor

Standalone Python CLI that reads original embedded images and product metadata from Excel catalogues. It writes one JPEG and JSON document per product, a combined manifest, warnings, and an optional ZIP archive.

## Installation

Python 3.10 or newer is required.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

## Supported formats

- `.xlsx`
- `.xlsm` (VBA is preserved while reading, but no workbook is written)

Legacy `.xls` files are rejected because `openpyxl` cannot read them. Convert an `.xls` file only after explicitly checking that LibreOffice is installed:

```bash
command -v libreoffice
libreoffice --headless --convert-to xlsx --outdir . catalogue.xls
```

## Default columns

| Column | Value                  |
| ------ | ---------------------- |
| A      | SKU                    |
| B      | Embedded product image |
| C      | Label                  |
| D      | Product name           |
| E      | Description            |
| F      | Unit                   |

The image is matched by its worksheet anchor row. The extractor first checks the configured SKU column at that row after applying `--row-offset`, then searches nearby rows using `--search-radius`, then scans nearby cells for an SKU-like value. Merged cells are resolved to their top-left value.

## Usage

```bash
python extract_excel_products.py catalogue.xlsx

python extract_excel_products.py catalogue.xlsx \
  --output products \
  --upscale 2 \
  --jpeg-quality 95 \
  --zip

python extract_excel_products.py catalogue.xlsx \
  --sku-col A \
  --label-col C \
  --name-col D \
  --description-col E \
  --unit-col F \
  --output products \
  --zip
```

Arguments:

- positional workbook path
- `--output` (default: `products`)
- `--sheet`, repeatable; all sheets are processed by default
- `--sku-col`, `--label-col`, `--name-col`, `--description-col`, `--unit-col`
- `--row-offset` (default: `0`)
- `--search-radius` (default: `2`)
- `--jpeg-quality` from `1` to `100` (default: `95`)
- `--upscale` from `1` to `4` (default: `1`)
- `--zip`

With the default `--upscale 1`, existing RGB JPEG images with normal orientation are copied without recompression. Other formats are converted using full chroma quality. An upscale factor greater than one uses Lanczos resampling followed by mild sharpening; `--upscale 2` is the recommended balance for low-resolution catalogue images.

## Output

```text
products/
  DTCDP6281.jpeg
  DTCDP6281.json
  DTDT4B91.jpeg
  DTDT4B91.json
  products.json
  warnings.txt
products.zip
```

`products.zip` is created beside the output directory only when `--zip` is used. Duplicate or filename-equivalent SKUs receive `-2`, `-3`, and later suffixes. To prevent stale files and accidental data loss, the output directory must be absent or empty and the ZIP path must not already exist.

Exit status is `0` on success, `2` for invalid configuration, `3` for an unreadable or unsupported workbook, `4` when no products are extracted, and `5` for output failures. A skipped unmatched image is a warning and does not fail an otherwise successful extraction.

## Limitations

- Product images must be supported by both `openpyxl` and Pillow.
- Formula-backed metadata requires cached values in the workbook because formulas are not recalculated.
- One primary image is emitted per worksheet row. When several drawings match one row, the largest image is selected and auxiliary drawings are recorded in `warnings.txt`.
- Upscaling improves pixel dimensions and edge clarity but cannot recover detail absent from the embedded source image.
- The search radius intentionally prevents association with distant product rows.
- Password-protected workbooks are not supported.

## Troubleshooting

- `unknown sheet`: check exact spelling and repeat `--sheet` for each required sheet.
- `no products were extracted`: inspect `warnings.txt`, verify that images are embedded rather than externally linked, and confirm the SKU column and row offset.
- Incorrect row association: reduce `--search-radius` or set `--row-offset` to the known image-to-metadata row difference.
- Invalid column errors: use Excel column letters from `A` through `XFD` and keep metadata columns distinct.
- Unreadable image warnings: open and resave the source image in a common raster format, then re-embed it in the workbook.
- Existing output errors: choose a new output path or move the previous extraction before rerunning.

## Tests

The tests generate workbooks in temporary directories and do not commit binary fixtures.

```bash
python -m unittest discover -s tests -v
```
