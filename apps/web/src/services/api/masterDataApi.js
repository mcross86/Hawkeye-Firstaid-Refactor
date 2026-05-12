import { apiFetch } from "./http";

export async function listCustomers() {
  return apiFetch("/api/master/customers");
}

export async function createCustomer(body) {
  return apiFetch("/api/master/customers", { method: "POST", body: JSON.stringify(body) });
}

export async function updateCustomer(id, body) {
  return apiFetch(`/api/master/customers/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export async function deleteCustomer(id) {
  return apiFetch(`/api/master/customers/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function listSitesForCustomer(customerId, { activeOnly = false } = {}) {
  const q = activeOnly ? "?activeOnly=1" : "";
  return apiFetch(`/api/master/customers/${encodeURIComponent(customerId)}/sites${q}`);
}

export async function createSite(body) {
  return apiFetch("/api/master/sites", { method: "POST", body: JSON.stringify(body) });
}

export async function updateSite(id, body) {
  return apiFetch(`/api/master/sites/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export async function deleteSite(id) {
  return apiFetch(`/api/master/sites/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function listSiteLocations(siteId, { activeOnly = false } = {}) {
  const q = activeOnly ? "?activeOnly=1" : "";
  return apiFetch(`/api/master/sites/${encodeURIComponent(siteId)}/locations${q}`);
}

export async function createSiteLocation(body) {
  return apiFetch("/api/master/site-locations", { method: "POST", body: JSON.stringify(body) });
}

export async function updateSiteLocation(id, body) {
  return apiFetch(`/api/master/site-locations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export async function deleteSiteLocation(id) {
  return apiFetch(`/api/master/site-locations/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function getSiteServiceHistory(siteId) {
  return apiFetch(`/api/master/sites/${encodeURIComponent(siteId)}/service-history`);
}

export async function listKitTypes() {
  return apiFetch("/api/master/kit-types");
}

export async function createKitType(body) {
  return apiFetch("/api/master/kit-types", { method: "POST", body: JSON.stringify(body) });
}

export async function updateKitType(id, body) {
  return apiFetch(`/api/master/kit-types/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export async function deleteKitType(id) {
  return apiFetch(`/api/master/kit-types/${encodeURIComponent(id)}`, { method: "DELETE" });
}
