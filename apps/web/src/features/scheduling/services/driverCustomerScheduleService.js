import * as scheduleApi from "../../../services/api/scheduleApi";

export async function getScheduledCustomersForDriverOnDate({ driverId, serviceDate }) {
  return scheduleApi.listScheduledCustomers(driverId, serviceDate);
}
