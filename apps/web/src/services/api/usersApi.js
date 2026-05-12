import { apiFetch } from "./http";

export async function listUsers() {
  return apiFetch("/api/users");
}

export async function createUser(body) {
  return apiFetch("/api/users", { method: "POST", body: JSON.stringify(body) });
}

export async function updateUser(id, body) {
  return apiFetch(`/api/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

export async function deleteUser(id) {
  return apiFetch(`/api/users/${encodeURIComponent(id)}`, { method: "DELETE" });
}
