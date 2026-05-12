import * as masterDataApi from "../../../services/api/masterDataApi";

export async function listCustomersForAdmin() {
  return masterDataApi.listCustomers();
}

export async function createCustomer({ name, isActive = true }) {
  return masterDataApi.createCustomer({ name, isActive });
}

export async function updateCustomer({ id, name, isActive }) {
  return masterDataApi.updateCustomer(id, { name, isActive });
}

export async function deleteCustomer(id) {
  return masterDataApi.deleteCustomer(id);
}
