import { listPurchaseOrders } from "../../services/api/purchaseOrderApi";
import { getMockPurchaseOrders } from "./mockPurchaseOrders";

/**
 * Driver analytics purchase order source.
 *
 * - Set `VITE_USE_MOCK_DRIVER_ANALYTICS=true` to always use sample orders (no API).
 * - Set `VITE_USE_MOCK_DRIVER_ANALYTICS=false` to always use `GET /api/clerk/purchase-orders`.
 * - If unset: production build uses API; dev server defaults to mock so the dashboard works without the API.
 */
export function isDriverAnalyticsMockMode() {
  const v = import.meta.env.VITE_USE_MOCK_DRIVER_ANALYTICS;
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return Boolean(import.meta.env.DEV);
}

export async function fetchPurchaseOrdersForAnalytics() {
  if (isDriverAnalyticsMockMode()) {
    return getMockPurchaseOrders();
  }
  return listPurchaseOrders();
}
