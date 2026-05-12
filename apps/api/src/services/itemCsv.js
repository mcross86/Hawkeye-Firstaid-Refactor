const ITEM_CSV_HEADERS = ["SKU", "Description", "CategoryId", "Active", "UOM", "Notes", "ListPriceUsd"];

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function parseActiveCell(value) {
  const v = String(value || "")
    .trim()
    .toUpperCase();
  if (["Y", "YES", "TRUE", "1"].includes(v)) return true;
  if (["N", "NO", "FALSE", "0"].includes(v)) return false;
  return true;
}

function parsePriceCell(value) {
  const n = Number(String(value || "").trim());
  return Number.isFinite(n) ? n : null;
}

function importItemsFromRows(rows, itemStore, nextItemId) {
  let created = 0;
  let updated = 0;
  const errors = [];

  rows.forEach((cells, rowIndex) => {
    const lineNum = rowIndex + 2;
    if (!cells.length || cells.every((c) => !String(c).trim())) return;

    const sku = cells[0];
    const name = cells[1];
    const categoryId = cells[2];
    const active = cells[3];
    const uom = cells[4];
    const notes = cells[5];
    const listPriceUsd = cells.length > 6 ? cells[6] : "";

    if (!sku || !String(sku).trim()) {
      errors.push(`Line ${lineNum}: SKU is required`);
      return;
    }
    if (!name || !String(name).trim()) {
      errors.push(`Line ${lineNum}: Description is required`);
      return;
    }
    if (!categoryId || !String(categoryId).trim()) {
      errors.push(`Line ${lineNum}: CategoryId is required`);
      return;
    }

    const payload = {
      sku: String(sku).trim(),
      name: String(name).trim(),
      categoryId: String(categoryId).trim(),
      isActive: parseActiveCell(active),
      uom: uom && String(uom).trim() ? String(uom).trim() : "EA",
      notes: notes ? String(notes).trim() : "",
      listPriceUsd: parsePriceCell(listPriceUsd)
    };

    const idx = itemStore.findIndex((i) => i.sku.trim().toLowerCase() === payload.sku.toLowerCase());
    if (idx >= 0) {
      itemStore[idx] = {
        ...itemStore[idx],
        ...payload,
        id: itemStore[idx].id
      };
      updated += 1;
    } else {
      itemStore.push({
        id: nextItemId(),
        ...payload
      });
      created += 1;
    }
  });

  return { created, updated, errors };
}

function validateCsvHeader(lines) {
  if (!lines.length) {
    return { ok: false, errors: ["File is empty"] };
  }
  const headerCells = parseCsvLine(lines[0]).map((h, idx) =>
    (idx === 0 ? h.replace(/^\uFEFF/, "") : h).trim()
  );
  const normalizedHeader = headerCells.map((h) => h.toLowerCase());
  const expectedMin = ITEM_CSV_HEADERS.slice(0, 4).map((h) => h.toLowerCase());
  const headerOk =
    normalizedHeader.length >= 4 &&
    normalizedHeader[0] === expectedMin[0] &&
    normalizedHeader[1] === expectedMin[1] &&
    normalizedHeader[2] === expectedMin[2] &&
    normalizedHeader[3] === expectedMin[3];

  if (!headerOk) {
    return {
      ok: false,
      errors: [
        `Header must start with: ${ITEM_CSV_HEADERS.slice(0, 4).join(",")} (optional columns: ${ITEM_CSV_HEADERS.slice(4).join(", ")})`
      ]
    };
  }
  return { ok: true };
}

module.exports = {
  ITEM_CSV_HEADERS,
  parseCsvLine,
  importItemsFromRows,
  validateCsvHeader
};
