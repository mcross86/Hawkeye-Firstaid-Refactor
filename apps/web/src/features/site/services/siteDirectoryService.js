import * as masterDataApi from "../../../services/api/masterDataApi";

export async function getSitesForCustomer(customerId) {
  if (!customerId) return [];
  return masterDataApi.listSitesForCustomer(customerId, { activeOnly: true });
}

export async function listSitesForAdmin(customerId) {
  if (!customerId) return [];
  return masterDataApi.listSitesForCustomer(customerId, { activeOnly: false });
}

export async function createSite(payload) {
  return masterDataApi.createSite(payload);
}

export async function updateSite(payload) {
  return masterDataApi.updateSite(payload.id, payload);
}

export async function deleteSite(id) {
  return masterDataApi.deleteSite(id);
}

export async function deleteSitesForCustomer(customerId) {
  const sites = await listSitesForAdmin(customerId);
  await Promise.all(sites.map((s) => masterDataApi.deleteSite(s.id)));
}

export async function getSiteLocationsForSite(siteId) {
  if (!siteId) return [];
  return masterDataApi.listSiteLocations(siteId, { activeOnly: true });
}

export async function listSiteLocationsForAdmin(siteId) {
  if (!siteId) return [];
  return masterDataApi.listSiteLocations(siteId, { activeOnly: false });
}

export async function createSiteLocation(payload) {
  return masterDataApi.createSiteLocation(payload);
}

export async function updateSiteLocation(payload) {
  return masterDataApi.updateSiteLocation(payload.id, payload);
}

export async function deleteSiteLocation(id) {
  return masterDataApi.deleteSiteLocation(id);
}

export async function listKitTypesForAdmin() {
  return masterDataApi.listKitTypes();
}
