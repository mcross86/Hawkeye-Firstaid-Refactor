/**
 * Sample purchase orders for Driver Performance analytics.
 * Shape matches GET /api/clerk/purchase-orders (camelCase JSON).
 *
 * Driver names come from User Configuration seed (`MOCK_ANALYTICS_DRIVERS_BY_KEY`).
 * Dates roll with the current calendar day so the default 30-day range usually includes data.
 * Replace by setting VITE_USE_MOCK_DRIVER_ANALYTICS=false (see analyticsSheetsSource.js).
 */

import { MOCK_ANALYTICS_DRIVERS_BY_KEY } from "../user/data/users";

const M = MOCK_ANALYTICS_DRIVERS_BY_KEY.morganLee.name;
const J = MOCK_ANALYTICS_DRIVERS_BY_KEY.jordanPark.name;
const A = MOCK_ANALYTICS_DRIVERS_BY_KEY.averyChen.name;

function pad2(n) {
  return String(n).padStart(2, "0");
}

/** YYYY-MM-DD for local calendar date */
function ymdLocal(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * ISO timestamp with fixed Chicago offset so 8am–5pm KPI matches America/Chicago on any dev machine.
 * Rough DST: Apr–Oct CDT (-05:00), else CST (-06:00).
 */
function chicagoOffsetForYmd(ymdStr) {
  const month = Number(ymdStr.slice(5, 7));
  return month >= 4 && month <= 10 ? "-05:00" : "-06:00";
}

/** Wall clock time in America/Chicago on the given calendar date */
function createdChicagoCivil(ymdStr, hour, minute) {
  const off = chicagoOffsetForYmd(ymdStr);
  return `${ymdStr}T${pad2(hour)}:${pad2(minute)}:00${off}`;
}

function line(sku, qty) {
  return { sku, itemDescription: null, quantity: qty, isAddOn: false };
}

/** @returns {object[]} Same shape as GET /api/clerk/purchase-orders */
export function getMockPurchaseOrders() {
  const today = new Date();
  const d0 = ymdLocal(today);
  const t1 = new Date(today);
  t1.setDate(t1.getDate() - 1);
  const d1 = ymdLocal(t1);
  const t2 = new Date(today);
  t2.setDate(t2.getDate() - 3);
  const d2 = ymdLocal(t2);
  const t3 = new Date(today);
  t3.setDate(t3.getDate() - 7);
  const d3 = ymdLocal(t3);

  return [
    {
      id: 90001,
      customerName: "Acme Manufacturing",
      siteName: "Main Plant — Dock A",
      serviceDate: d0,
      driverName: M,
      notes: null,
      status: "submitted",
      createdAt: createdChicagoCivil(d0, 8, 15),
      items: [line("BND-1001", 2), line("PPE-4001", 1)]
    },
    {
      id: 90002,
      customerName: "Acme Manufacturing",
      siteName: "Warehouse East",
      serviceDate: d0,
      driverName: M,
      notes: null,
      status: "submitted",
      createdAt: createdChicagoCivil(d0, 9, 40),
      items: [line("ANT-3001", 3), line("BRN-2001", 1)]
    },
    {
      id: 90003,
      customerName: "Acme Manufacturing",
      siteName: "Main Plant — Dock A",
      serviceDate: d0,
      driverName: M,
      notes: "Return visit — add-on",
      status: "submitted",
      createdAt: createdChicagoCivil(d0, 10, 25),
      items: [line("MED-5001", 1)]
    },
    {
      id: 90004,
      customerName: "Blue River Clinic",
      siteName: "Urgent Care",
      serviceDate: d0,
      driverName: M,
      notes: null,
      status: "submitted",
      createdAt: createdChicagoCivil(d0, 14, 5),
      items: [line("ANT-3003", 2), line("BND-1002", 4)]
    },
    {
      id: 90005,
      customerName: "Summit Foods",
      siteName: "Distribution Center",
      serviceDate: d1,
      driverName: M,
      notes: null,
      status: "submitted",
      createdAt: createdChicagoCivil(d1, 8, 5),
      items: [line("PPE-4001", 5)]
    },
    {
      id: 90006,
      customerName: "Summit Foods",
      siteName: "Distribution Center",
      serviceDate: d1,
      driverName: M,
      notes: null,
      status: "submitted",
      createdAt: createdChicagoCivil(d1, 8, 50),
      items: [line("BND-1003", 2)]
    },
    {
      id: 90007,
      customerName: "Northwind School District",
      siteName: "Admin Building",
      serviceDate: d1,
      driverName: J,
      notes: null,
      status: "submitted",
      createdAt: createdChicagoCivil(d1, 9, 20),
      items: [line("BRN-2002", 2), line("PPE-4002", 1)]
    },
    {
      id: 90008,
      customerName: "Northwind School District",
      siteName: "High School Gym",
      serviceDate: d1,
      driverName: J,
      notes: null,
      status: "submitted",
      createdAt: createdChicagoCivil(d1, 11, 0),
      items: [line("BND-1001", 6), line("ANT-3002", 1)]
    },
    {
      id: 90009,
      customerName: "Harbor Logistics",
      siteName: "Office",
      serviceDate: d1,
      driverName: J,
      notes: null,
      status: "submitted",
      createdAt: createdChicagoCivil(d1, 13, 45),
      items: [line("MED-5002", 2), line("MED-5003", 2)]
    },
    {
      id: 90010,
      customerName: "Acme Manufacturing",
      siteName: "Main Plant — Dock A",
      serviceDate: d2,
      driverName: M,
      notes: null,
      status: "submitted",
      createdAt: createdChicagoCivil(d2, 10, 0),
      items: [line("PPE-4003", 1), line("BRN-2003", 2)]
    },
    {
      id: 90011,
      customerName: "Blue River Clinic",
      siteName: "Main Campus",
      serviceDate: d2,
      driverName: M,
      notes: null,
      status: "submitted",
      createdAt: createdChicagoCivil(d2, 15, 30),
      items: [line("ANT-3001", 4)]
    },
    {
      id: 90012,
      customerName: "Lakeside Hotel",
      siteName: "Kitchen",
      serviceDate: d3,
      driverName: A,
      notes: null,
      status: "submitted",
      createdAt: createdChicagoCivil(d3, 8, 0),
      items: [line("BRN-2001", 3), line("BND-1002", 2)]
    },
    {
      id: 90013,
      customerName: "Lakeside Hotel",
      siteName: "Pool House",
      serviceDate: d3,
      driverName: A,
      notes: null,
      status: "submitted",
      createdAt: createdChicagoCivil(d3, 9, 15),
      items: [line("PPE-4001", 2)]
    },
    {
      id: 90014,
      customerName: "Lakeside Hotel",
      siteName: "Kitchen",
      serviceDate: d3,
      driverName: A,
      notes: "Second pass same day",
      status: "submitted",
      createdAt: createdChicagoCivil(d3, 14, 0),
      items: [line("ANT-3003", 1)]
    },
    {
      id: 90015,
      customerName: "Metro Transit Garage",
      siteName: "Bay 3",
      serviceDate: d3,
      driverName: A,
      notes: null,
      status: "submitted",
      createdAt: createdChicagoCivil(d3, 16, 20),
      items: [line("BND-1001", 8), line("PPE-4001", 3)]
    }
  ];
}
