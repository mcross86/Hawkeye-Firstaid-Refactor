import * as masterDataApi from "../../../services/api/masterDataApi";

export async function listCustomersForAdmin() {
  return masterDataApi.listCustomers();
}

export async function createCustomer({ name, isActive = true, orderAnyTime = true }) {
  return masterDataApi.createCustomer({ name, isActive, orderAnyTime });
}

export async function updateCustomer({ id, name, isActive, orderAnyTime }) {
  return masterDataApi.updateCustomer(id, { name, isActive, orderAnyTime });
}

export async function deleteCustomer(id) {
  return masterDataApi.deleteCustomer(id);
}
