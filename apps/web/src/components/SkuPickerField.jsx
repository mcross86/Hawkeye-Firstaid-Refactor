import { Autocomplete, TextField } from "@mui/material";

function filterCatalogOptions(options, { inputValue }) {
  const q = String(inputValue || "")
    .trim()
    .toLowerCase();
  if (!q) {
    return options;
  }
  return options.filter(
    (item) =>
      String(item.sku || "")
        .toLowerCase()
        .includes(q) ||
      String(item.name || "")
        .toLowerCase()
        .includes(q)
  );
}

/**
 * Searchable picker over the full active item catalog (SKU + description).
 */
export default function SkuPickerField({ catalogItems, value, onChange, disabled = false }) {
  const selected =
    catalogItems.find((item) => String(item.sku) === String(value || "")) || null;

  return (
    <Autocomplete
      size="small"
      fullWidth
      disabled={disabled}
      options={catalogItems}
      value={selected}
      onChange={(_, item) => onChange(item?.sku || "")}
      getOptionLabel={(item) =>
        item ? `${item.sku} — ${item.name || ""}`.trim() : ""
      }
      isOptionEqualToValue={(a, b) => a?.sku === b?.sku}
      filterOptions={filterCatalogOptions}
      openOnFocus
      autoHighlight
      clearOnBlur={false}
      ListboxProps={{ style: { maxHeight: 320 } }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="SKU"
          placeholder="Search SKU or description"
        />
      )}
      renderOption={(props, item) => (
        <li {...props} key={item.id || item.sku}>
          <span>
            <strong>{item.sku}</strong>
            {item.name ? ` — ${item.name}` : ""}
          </span>
        </li>
      )}
      noOptionsText="No matching SKUs"
    />
  );
}
