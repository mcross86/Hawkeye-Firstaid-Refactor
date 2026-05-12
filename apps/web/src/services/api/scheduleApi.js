import { apiFetch } from "./http";

export async function listSchedule() {
  return apiFetch("/api/schedule");
}

export async function createScheduleRow(body) {
  return apiFetch("/api/schedule", { method: "POST", body: JSON.stringify(body) });
}

export async function updateScheduleRow(id, body) {
  return apiFetch(`/api/schedule/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export async function deleteScheduleRow(id) {
  return apiFetch(`/api/schedule/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function listScheduledCustomers(driverId, serviceDate) {
  const q = `?driverId=${encodeURIComponent(driverId)}&serviceDate=${encodeURIComponent(serviceDate)}`;
  return apiFetch(`/api/field/scheduled-customers${q}`);
}
