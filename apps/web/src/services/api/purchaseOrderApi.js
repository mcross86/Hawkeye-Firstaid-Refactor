import { apiFetch, apiUrl } from "./http";

export async function listPurchaseOrders() {
  return apiFetch("/api/clerk/purchase-orders");
}

export async function submitPurchaseOrder(payload) {
  const response = await fetch(apiUrl("/api/driver/purchase-orders"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Failed to submit purchase order");
  }

  return response.json();
}

export async function updatePurchaseOrder(id, payload) {
  return apiFetch(`/api/clerk/purchase-orders/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}
