import * as itemsApi from "../../../services/api/itemsApi";

export const ITEM_CSV_HEADERS = ["SKU", "Description", "CategoryId", "Active", "UOM", "Notes", "ListPriceUsd"];

export function buildItemImportTemplateCsv() {
  const lines = [
    ITEM_CSV_HEADERS.join(","),
    "EXAMPLE-001,Example item description,cat-bandages,Y,EA,Optional internal note,12.50"
  ];
  return lines.join("\r\n");
}

export function buildItemCatalogExportCsv(items) {
  const header = ITEM_CSV_HEADERS.join(",");
  const rows = items.map((item) =>
    [
      csvEscape(item.sku),
      csvEscape(item.name),
      csvEscape(item.categoryId),
      item.isActive ? "Y" : "N",
      csvEscape(item.uom || "EA"),
      csvEscape(item.notes || ""),
      item.listPriceUsd != null && Number.isFinite(Number(item.listPriceUsd))
        ? String(item.listPriceUsd)
        : ""
    ].join(",")
  );
  return [header, ...rows].join("\r\n");
}

function csvEscape(value) {
  const str = String(value ?? "");
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function listItemsForAdmin() {
  const rows = await itemsApi.listItems();
  return [...rows]
    .map((item) => ({
      ...item,
      uom: item.uom != null && String(item.uom).trim() ? String(item.uom).trim() : "EA",
      notes: item.notes != null ? String(item.notes) : ""
    }))
    .sort((a, b) => a.sku.localeCompare(b.sku, undefined, { sensitivity: "base" }));
}

export async function createItem({
  sku,
  name,
  categoryId,
  isActive = true,
  uom = "EA",
  notes = "",
  listPriceUsd
}) {
  return itemsApi.createItem({
    sku,
    name,
    categoryId,
    isActive,
    uom,
    notes,
    listPriceUsd
  });
}

export async function updateItem({ id, sku, name, categoryId, isActive, uom, notes, listPriceUsd }) {
  return itemsApi.updateItem(id, {
    sku,
    name,
    categoryId,
    isActive,
    uom,
    notes,
    listPriceUsd
  });
}

export async function deleteItem(id) {
  await itemsApi.deleteItem(id);
}

export async function importItemsFromCsvText(text) {
  return itemsApi.importItemsCsv(text);
}
