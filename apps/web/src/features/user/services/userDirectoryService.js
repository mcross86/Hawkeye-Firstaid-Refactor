import * as usersApi from "../../../services/api/usersApi";

export async function listUsers() {
  const rows = await usersApi.listUsers();
  return [...rows]
    .map((u) => ({ ...u, userIdNumber: u.userIdNumber != null ? String(u.userIdNumber) : "" }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createUser({ name, email, role, userIdNumber, isActive = true }) {
  return usersApi.createUser({
    name,
    email,
    role,
    userIdNumber,
    isActive
  });
}

export async function updateUser({ id, name, email, role, userIdNumber, isActive }) {
  return usersApi.updateUser(id, {
    name,
    email,
    role,
    userIdNumber,
    isActive
  });
}

export async function deleteUser(id) {
  await usersApi.deleteUser(id);
}

export async function getActiveDriversForFieldApp() {
  const users = await listUsers();
  return users
    .filter((u) => u.role === "driver" && u.isActive)
    .map((u) => ({
      id: u.id,
      name: u.name,
      userIdNumber: String(u.userIdNumber || "").trim()
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function verifyDriverFieldLogin({ userId, userIdNumber }) {
  const users = await listUsers();
  const user = users.find((u) => u.id === userId);

  if (!user || user.role !== "driver" || !user.isActive) {
    return { ok: false, reason: "Select your name from the active driver list." };
  }

  if (String(user.userIdNumber || "").trim() !== String(userIdNumber || "").trim()) {
    return { ok: false, reason: "User ID # does not match the selected driver." };
  }

  return {
    ok: true,
    driver: {
      id: user.id,
      name: user.name,
      userIdNumber: String(user.userIdNumber || "").trim()
    }
  };
}
