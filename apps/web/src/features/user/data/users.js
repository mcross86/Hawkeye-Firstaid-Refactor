/** @typedef {'admin' | 'driver' | 'clerk'} UserRole */

export const USER_ROLES = /** @type {const} */ (["admin", "driver", "clerk"]);

export const MOCK_ANALYTICS_DRIVERS_BY_KEY = {
  morganLee: {
    id: "user-ana-morgan",
    name: "Morgan Lee",
    email: "morgan.lee@hawkeye.example",
    role: "driver",
    userIdNumber: "3101",
    isActive: true
  },
  jordanPark: {
    id: "user-ana-jordan",
    name: "Jordan Park",
    email: "jordan.park@hawkeye.example",
    role: "driver",
    userIdNumber: "3102",
    isActive: true
  },
  averyChen: {
    id: "user-ana-avery",
    name: "Avery Chen",
    email: "avery.chen@hawkeye.example",
    role: "driver",
    userIdNumber: "3103",
    isActive: true
  }
};
