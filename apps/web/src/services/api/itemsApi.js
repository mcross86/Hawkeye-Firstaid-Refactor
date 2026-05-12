import { apiFetch } from "./http";

export async function listItems() {
  return apiFetch("/api/items");
}

export async function createItem(body) {
  return apiFetch("/api/items", { method: "POST", body: JSON.stringify(body) });
}

export async function updateItem(id, body) {
  return apiFetch(`/api/items/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export async function deleteItem(id) {
  return apiFetch(`/api/items/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function importItemsCsv(csvText) {
  return apiFetch("/api/items/import-csv", {
    method: "POST",
    body: JSON.stringify({ csvText })
  });
}
