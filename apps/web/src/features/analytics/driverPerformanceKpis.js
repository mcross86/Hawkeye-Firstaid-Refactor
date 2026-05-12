/**
 * Driver performance KPIs from purchase order records + optional SKU list prices.
 * Business-hours window: America/Chicago, 8:00 inclusive to 17:00 exclusive.
 */

const CHICAGO_TZ = "America/Chicago";

function parseDbTimestamp(value) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  const normalized = /[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s.replace(" ", "T")}Z`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isWithinBusinessHoursChicago(isoDate) {
  const d = parseDbTimestamp(isoDate);
  if (!d) return false;
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const parts = fmt.formatToParts(d);
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  const minute = Number(parts.find((p) => p.type === "minute")?.value);
  const minutes = hour * 60 + minute;
  return minutes >= 8 * 60 && minutes < 17 * 60;
}

function locationKey(sheet) {
  const site = sheet.siteName != null ? String(sheet.siteName) : "";
  return `${String(sheet.customerName || "").trim()}\t${site.trim()}`;
}

function sheetTotalUsd(sheet, skuToPrice) {
  const items = sheet.items || [];
  return items.reduce((sum, row) => {
    const sku = String(row.sku || "");
    const qty = Number(row.quantity) || 0;
    const unit = skuToPrice[sku] ?? skuToPrice[sku.toUpperCase()] ?? 0;
    return sum + qty * unit;
  }, 0);
}

function inServiceDateRange(serviceDate, fromDate, toDate) {
  if (!serviceDate) return false;
  return serviceDate >= fromDate && serviceDate <= toDate;
}

/**
 * @param {unknown[]} sheets
 * @param {Record<string, number>} skuToPrice
 * @param {string} fromDate YYYY-MM-DD
 * @param {string} toDate YYYY-MM-DD
 */
export function computeDriverPerformanceRows(sheets, skuToPrice, fromDate, toDate) {
  const filtered = (sheets || []).filter((s) => inServiceDateRange(s.serviceDate, fromDate, toDate));
  const byDriver = new Map();

  for (const sheet of filtered) {
    const driver = String(sheet.driverName || "").trim() || "Unknown";
    if (!byDriver.has(driver)) {
      byDriver.set(driver, []);
    }
    byDriver.get(driver).push(sheet);
  }

  const rows = [];

  for (const [driverName, driverSheets] of byDriver) {
    const byServiceDate = new Map();
    for (const s of driverSheets) {
      const d = s.serviceDate;
      if (!byServiceDate.has(d)) byServiceDate.set(d, []);
      byServiceDate.get(d).push(s);
    }

    const dailyStopCounts = [];
    const dedupedOrderTotals = [];
    let totalGapMinutes = 0;
    let gapPairCount = 0;

    for (const [, daySheets] of byServiceDate) {
      dailyStopCounts.push(daySheets.length);

      const byLoc = new Map();
      for (const sh of daySheets) {
        const k = locationKey(sh);
        if (!byLoc.has(k)) byLoc.set(k, []);
        byLoc.get(k).push(sh);
      }
      for (const group of byLoc.values()) {
        const total = group.reduce((acc, sh) => acc + sheetTotalUsd(sh, skuToPrice), 0);
        dedupedOrderTotals.push(total);
      }

      const inWindow = daySheets
        .filter((sh) => isWithinBusinessHoursChicago(sh.createdAt))
        .sort((a, b) => (parseDbTimestamp(a.createdAt) || 0) - (parseDbTimestamp(b.createdAt) || 0));
      for (let i = 1; i < inWindow.length; i += 1) {
        const t0 = parseDbTimestamp(inWindow[i - 1].createdAt);
        const t1 = parseDbTimestamp(inWindow[i].createdAt);
        if (t0 && t1 && t1 > t0) {
          totalGapMinutes += (t1 - t0) / 60000;
          gapPairCount += 1;
        }
      }
    }

    const avgStopsPerDay =
      dailyStopCounts.length > 0
        ? dailyStopCounts.reduce((a, b) => a + b, 0) / dailyStopCounts.length
        : 0;

    const dedupedOrderSum = dedupedOrderTotals.reduce((a, b) => a + b, 0);
    const dedupedOrderCount = dedupedOrderTotals.length;
    const avgOrderUsd = dedupedOrderCount > 0 ? dedupedOrderSum / dedupedOrderCount : 0;

    const avgGapMinutes = gapPairCount > 0 ? totalGapMinutes / gapPairCount : null;

    rows.push({
      driverName,
      orderCount: driverSheets.length,
      activeDays: dailyStopCounts.length,
      avgStopsPerDay,
      avgOrderValueUsd: avgOrderUsd,
      avgMinutesBetweenOrders: avgGapMinutes,
      gapsSampleSize: gapPairCount,
      dedupedOrderSum,
      dedupedOrderCount,
      totalGapMinutes,
      gapPairCount
    });
  }

  rows.sort((a, b) => a.driverName.localeCompare(b.driverName, undefined, { sensitivity: "base" }));
  return rows;
}

export function computeFleetAggregates(rows) {
  if (!rows.length) {
    return {
      driverCount: 0,
      avgStopsPerDayMean: 0,
      avgOrderValueUsd: 0,
      avgMinutesBetweenOrders: null,
      gapPairCount: 0
    };
  }
  const avgStopsPerDayMean =
    rows.reduce((acc, r) => acc + r.avgStopsPerDay, 0) / rows.length;
  const dedupedSum = rows.reduce((acc, r) => acc + r.dedupedOrderSum, 0);
  const dedupedCount = rows.reduce((acc, r) => acc + r.dedupedOrderCount, 0);
  const avgOrderValueUsd = dedupedCount > 0 ? dedupedSum / dedupedCount : 0;
  const gapPairCount = rows.reduce((acc, r) => acc + r.gapPairCount, 0);
  const totalGapMinutes = rows.reduce((acc, r) => acc + r.totalGapMinutes, 0);
  const avgMinutesBetweenOrders = gapPairCount > 0 ? totalGapMinutes / gapPairCount : null;
  return {
    driverCount: rows.length,
    avgStopsPerDayMean,
    avgOrderValueUsd,
    avgMinutesBetweenOrders,
    gapPairCount
  };
}

export function formatMinutesAsHrsMins(minutes) {
  if (minutes == null || Number.isNaN(minutes)) return "—";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}
