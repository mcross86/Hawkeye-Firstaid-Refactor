# Item catalog CSV imports

## Upload in production

1. Open **Items Configuration** in the Hawkeye web app.
2. Click **Upload CSV** and select `hawkeye-sku-list-photo-import.csv`.
3. Review the import summary (created / updated counts).

## Required CSV format

Header row must match the app template (same as **Download template** on Items Configuration):

```text
SKU,Description,CategoryId,Active,UOM,Notes,ListPriceUsd
```

| Column | Source (photo list) | Notes |
|--------|---------------------|--------|
| SKU | **No.** column | Required |
| Description | **Product name** column | Required; quote if name contains commas |
| CategoryId | Assigned in import file | Required — must match categories in your DB |
| Active | `Y` | Required (`Y`/`N`) |
| UOM | `EA` | Optional; defaults to EA |
| Notes | Optional | |
| ListPriceUsd | Empty in photo import | Optional; add prices later or in CSV |

## Valid CategoryId values (seed / default)

- `cat-bandages` — Bandages & Dressings
- `cat-burn` — Burn Care
- `cat-antiseptic` — Antiseptics & Wound Cleaning
- `cat-ppe` — PPE & Protection
- `cat-meds` — OTC Relief

`hawkeye-sku-list-photo-import.csv` assigns categories from product type. Adjust rows in the CSV or in Items Configuration after import if needed.

## Files

- `hawkeye-sku-list-photo-import.csv` — 65 SKUs from the paper SKU list (No. → SKU, Product name → Description).
