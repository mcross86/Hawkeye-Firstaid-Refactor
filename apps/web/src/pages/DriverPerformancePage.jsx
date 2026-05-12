import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Grid2 as Grid,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";
import { fetchPurchaseOrdersForAnalytics } from "../features/analytics/analyticsSheetsSource";
import { listItemsForAdmin } from "../features/item/services/itemDirectoryService";
import {
  computeDriverPerformanceRows,
  computeFleetAggregates,
  formatMinutesAsHrsMins
} from "../features/analytics/driverPerformanceKpis";

function defaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  const toYmd = (d) => d.toISOString().split("T")[0];
  return { from: toYmd(start), to: toYmd(end) };
}

function formatUsd(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function DriverPerformancePage() {
  const [{ from, to }, setRange] = useState(defaultDateRange);
  const [driverFilter, setDriverFilter] = useState("");
  const [sheets, setSheets] = useState([]);
  const [skuToPrice, setSkuToPrice] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [purchaseOrderList, items] = await Promise.all([
        fetchPurchaseOrdersForAnalytics(),
        listItemsForAdmin()
      ]);
      setSheets(purchaseOrderList);
      const map = {};
      for (const it of items) {
        const p = Number(it.listPriceUsd);
        if (Number.isFinite(p) && p >= 0) {
          map[String(it.sku)] = p;
        }
      }
      setSkuToPrice(map);
    } catch (e) {
      setError(e.message || "Failed to load analytics");
      setSheets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const allRows = useMemo(
    () => computeDriverPerformanceRows(sheets, skuToPrice, from, to),
    [sheets, skuToPrice, from, to]
  );

  const tableRows = useMemo(() => {
    if (!driverFilter) return allRows;
    return allRows.filter((r) => r.driverName === driverFilter);
  }, [allRows, driverFilter]);

  const fleet = useMemo(() => computeFleetAggregates(tableRows), [tableRows]);

  const driverOptions = useMemo(() => {
    const names = [...new Set(allRows.map((r) => r.driverName))];
    return names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [allRows]);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={700}>
        Driver performance
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
        <TextField
          size="small"
          type="date"
          label="From"
          value={from}
          onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          size="small"
          type="date"
          label="To"
          value={to}
          onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          size="small"
          select
          label="Driver"
          value={driverFilter}
          onChange={(e) => setDriverFilter(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All drivers</MenuItem>
          {driverOptions.map((name) => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </TextField>
        <Button size="small" variant="outlined" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && from > to && (
        <Alert severity="warning">&quot;From&quot; must be on or before &quot;To&quot;.</Alert>
      )}

      {!loading && !error && from <= to && (
        <>
          <Grid container spacing={2} justifyContent="center">
            <Grid size={{ xs: 12, sm: 4 }}>
              <Stack spacing={1.25} alignItems="center">
                <Typography variant="subtitle2" color="text.secondary" textAlign="center" fontWeight={600}>
                  Avg. stops per day
                </Typography>
                <Box
                  sx={{
                    width: 140,
                    height: 140,
                    borderRadius: "50%",
                    border: 1,
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "background.paper"
                  }}
                >
                  <Typography variant="h5" fontWeight={700} sx={{ px: 1, textAlign: "center" }}>
                    {fleet.driverCount ? fleet.avgStopsPerDayMean.toFixed(1) : "—"}
                  </Typography>
                </Box>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Stack spacing={1.25} alignItems="center">
                <Typography variant="subtitle2" color="text.secondary" textAlign="center" fontWeight={600}>
                  Avg. order value
                </Typography>
                <Box
                  sx={{
                    width: 140,
                    height: 140,
                    borderRadius: "50%",
                    border: 1,
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "background.paper"
                  }}
                >
                  <Typography
                    variant="h6"
                    fontWeight={700}
                    sx={{ px: 1.5, textAlign: "center", lineHeight: 1.2 }}
                  >
                    {fleet.driverCount && fleet.avgOrderValueUsd != null
                      ? formatUsd(fleet.avgOrderValueUsd)
                      : "—"}
                  </Typography>
                </Box>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Stack spacing={1.25} alignItems="center">
                <Typography variant="subtitle2" color="text.secondary" textAlign="center" fontWeight={600}>
                  Avg. gap (8–5 CT)
                </Typography>
                <Box
                  sx={{
                    width: 140,
                    height: 140,
                    borderRadius: "50%",
                    border: 1,
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "background.paper"
                  }}
                >
                  <Typography variant="h5" fontWeight={700} sx={{ px: 1, textAlign: "center" }}>
                    {formatMinutesAsHrsMins(fleet.avgMinutesBetweenOrders)}
                  </Typography>
                </Box>
              </Stack>
            </Grid>
          </Grid>

          <TableContainer component={Card} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Driver</TableCell>
                  <TableCell align="right">Orders</TableCell>
                  <TableCell align="right">Active days</TableCell>
                  <TableCell align="right">Avg. stops / day</TableCell>
                  <TableCell align="right">Avg. order value</TableCell>
                  <TableCell align="right">Avg. gap (8–5 CT)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tableRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography variant="body2" color="text.secondary">
                        No purchase orders in this range.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  tableRows.map((row) => (
                    <TableRow key={row.driverName}>
                      <TableCell>{row.driverName}</TableCell>
                      <TableCell align="right">{row.orderCount}</TableCell>
                      <TableCell align="right">{row.activeDays}</TableCell>
                      <TableCell align="right">{row.avgStopsPerDay.toFixed(1)}</TableCell>
                      <TableCell align="right">{formatUsd(row.avgOrderValueUsd)}</TableCell>
                      <TableCell align="right">
                        {formatMinutesAsHrsMins(row.avgMinutesBetweenOrders)}
                        {row.gapsSampleSize > 0 ? (
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                            ({row.gapsSampleSize})
                          </Typography>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {loading && (
        <Typography variant="body2" color="text.secondary">
          Loading…
        </Typography>
      )}
    </Stack>
  );
}

export default DriverPerformancePage;
