import { apiFetch } from "./http";

export async function listItemCategoriesMerged() {
  return apiFetch("/api/catalog/item-categories");
}

export async function getCategoryDisplayRows(driverId) {
  const q = driverId ? `?driverId=${encodeURIComponent(driverId)}` : "";
  return apiFetch(`/api/catalog/category-display${q}`);
}

export async function saveCategoryDisplay({ driverId, rows }) {
  return apiFetch("/api/catalog/category-display", {
    method: "PUT",
    body: JSON.stringify({ driverId, rows })
  });
}

export async function listConfiguredCategories(driverId) {
  const q = driverId ? `?driverId=${encodeURIComponent(driverId)}` : "";
  return apiFetch(`/api/catalog/configured-categories${q}`);
}
