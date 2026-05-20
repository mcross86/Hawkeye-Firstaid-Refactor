import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
  Link
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import {
  createCustomer,
  deleteCustomer,
  listCustomersForAdmin,
  updateCustomer
} from "../features/customer/services/customerDirectoryService";
import {
  createSite,
  createSiteLocation,
  deleteSite,
  deleteSiteLocation,
  listKitTypesForAdmin,
  listSiteLocationsForAdmin,
  listSitesForAdmin,
  updateSite,
  updateSiteLocation
} from "../features/site/services/siteDirectoryService";

const emptyCustomerForm = () => ({ id: "", name: "", isActive: true, orderAnyTime: true });

const emptySiteForm = () => ({
  id: "",
  customerId: "",
  name: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  pocName: "",
  pocTitle: "",
  pocPhone: "",
  entryNotes: "",
  hoursOfOperation: "",
  preferredServiceTimeOfDay: "",
  serviceFrequency: "",
  serviceFrequencyCount: 1,
  serviceFrequencyUnit: "months",
  isActive: true,
  serviceHistory: [],
  scheduledServices: [],
  baseLastServiceDate: ""
});

const emptySiteLocationForm = () => ({
  id: "",
  siteId: "",
  customerId: "",
  name: "",
  kitTypeId: "",
  isActive: true
});

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null}
    </div>
  );
}

function PropRow({ label, value, multiline = false }) {
  const display = value != null && String(value).trim() !== "";
  return (
    <Box sx={{ py: 0.75 }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: multiline ? "pre-wrap" : "normal", mt: 0.25 }}>
        {display ? String(value) : "—"}
      </Typography>
    </Box>
  );
}

function parseServiceFrequency(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return null;

  if (raw.includes("biweekly")) return { days: 14 };
  if (raw.includes("weekly")) return { days: 7 };
  if (raw.includes("daily")) return { days: 1 };
  if (raw.includes("quarter")) return { months: 3 };
  if (raw.includes("semi")) return { months: 6 };
  if (raw.includes("annual") || raw.includes("yearly")) return { months: 12 };
  if (raw.includes("monthly")) return { months: 1 };

  const m = raw.match(/every\s+(\d+)\s*(day|week|month|year)s?/i);
  if (m) {
    const n = Number(m[1]);
    const unit = m[2];
    if (!Number.isFinite(n) || n <= 0) return null;
    if (unit === "day") return { days: n };
    if (unit === "week") return { days: n * 7 };
    if (unit === "month") return { months: n };
    if (unit === "year") return { months: n * 12 };
  }

  const days = raw.match(/(\d+)\s*day/);
  if (days) {
    const n = Number(days[1]);
    return Number.isFinite(n) && n > 0 ? { days: n } : null;
  }

  const weeks = raw.match(/(\d+)\s*week/);
  if (weeks) {
    const n = Number(weeks[1]);
    return Number.isFinite(n) && n > 0 ? { days: n * 7 } : null;
  }

  const months = raw.match(/(\d+)\s*month/);
  if (months) {
    const n = Number(months[1]);
    return Number.isFinite(n) && n > 0 ? { months: n } : null;
  }

  return null;
}

function frequencyUiFromStored(value) {
  const raw = String(value || "").trim();
  if (!raw) return { count: 1, unit: "months" };
  const m = raw.toLowerCase().match(/every\s+(\d+)\s*(day|week|month|year)s?/i);
  if (m) {
    const n = Number(m[1]);
    const unit = m[2];
    const normalizedUnit = `${unit}s`;
    if (Number.isFinite(n) && n >= 1 && n <= 12) {
      return { count: n, unit: normalizedUnit };
    }
  }
  const interval = parseServiceFrequency(raw);
  if (interval?.months) {
    const months = interval.months;
    if (months % 12 === 0 && months / 12 >= 1 && months / 12 <= 12) {
      return { count: months / 12, unit: "years" };
    }
    if (months >= 1 && months <= 12) {
      return { count: months, unit: "months" };
    }
  }
  if (interval?.days) {
    const days = interval.days;
    if (days % 7 === 0 && days / 7 >= 1 && days / 7 <= 12) {
      return { count: days / 7, unit: "weeks" };
    }
    if (days >= 1 && days <= 12) {
      return { count: days, unit: "days" };
    }
  }
  return { count: 1, unit: "months" };
}

function formatServiceFrequency(count, unit) {
  const n = Number(count);
  if (!Number.isFinite(n) || n < 1) return "";
  const u = String(unit || "").trim().toLowerCase();
  if (!["days", "weeks", "months", "years"].includes(u)) return "";
  const singular = u.replace(/s$/, "");
  return `Every ${n} ${n === 1 ? singular : u}`;
}

function maxYmd(a, b) {
  if (!a) return b || "";
  if (!b) return a || "";
  return String(a) >= String(b) ? String(a) : String(b);
}

function computeLastServiceDate({ historyLog, manualHistory }) {
  const logMax = (historyLog || []).reduce((m, r) => maxYmd(m, r?.serviceDate), "");
  const manualMax = (manualHistory || []).reduce((m, r) => maxYmd(m, r?.date), "");
  return maxYmd(logMax, manualMax);
}

function addIntervalToYmd(ymd, interval) {
  if (!ymd || !interval) return "";
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  if (interval.months) {
    const day = d.getDate();
    d.setMonth(d.getMonth() + interval.months);
    // If month roll caused date shift, clamp by re-setting day when possible.
    if (d.getDate() !== day) {
      d.setDate(0);
    }
  }
  if (interval.days) {
    d.setDate(d.getDate() + interval.days);
  }
  return d.toISOString().split("T")[0];
}

function computeNextVisitDate({ lastServiceDate, serviceFrequency }) {
  const interval = parseServiceFrequency(serviceFrequency);
  if (!interval) return "";
  return addIntervalToYmd(lastServiceDate, interval);
}

function upsertAutoNextVisitRow(scheduledServices, nextVisitDate) {
  if (!nextVisitDate) return scheduledServices;
  const list = Array.isArray(scheduledServices) ? [...scheduledServices] : [];
  const idx = list.findIndex((r) => r && r.isAutoNextVisit);
  const row = { date: nextVisitDate, notes: "Next visit (auto)", isAutoNextVisit: true };
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...row };
    return list;
  }
  return [row, ...list];
}

function SiteDetailTabPanels({
  site,
  customerId,
  detailTab,
  siteLocations,
  onEditSiteFromTab,
  openCreateSiteLocation,
  openEditSiteLocation,
  setDeleteSiteLocationTarget
}) {
  return (
    <>
      <TabPanel value={detailTab} index={0}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
          <Box sx={{ flex: 1 }}>
            <PropRow label="Site name" value={site.name} />
            <PropRow label="Street address" value={site.address} />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <PropRow label="City" value={site.city} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <PropRow label="State" value={site.state} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <PropRow label="ZIP" value={site.zip} />
              </Box>
            </Stack>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Divider sx={{ display: { xs: "block", md: "none" }, my: 1 }} />
            <PropRow label="Hours of operation" value={site.hoursOfOperation} />
            <PropRow label="Preferred service time of day" value={site.preferredServiceTimeOfDay} />
            <PropRow label="Service frequency" value={site.serviceFrequency} />
            <PropRow
              label="Next visit (auto)"
              value={computeNextVisitDate({
                lastServiceDate: computeLastServiceDate({
                  historyLog: site.serviceHistoryLog,
                  manualHistory: site.serviceHistory
                }),
                serviceFrequency: site.serviceFrequency
              })}
            />
            <PropRow label="Site status" value={site.isActive ? "Active" : "Inactive"} />
          </Box>
        </Stack>
        <Button size="small" sx={{ mt: 2 }} variant="outlined" onClick={() => onEditSiteFromTab(site, 0)}>
          Edit address & operations
        </Button>
      </TabPanel>

      <TabPanel value={detailTab} index={1}>
        <PropRow label="Point of contact" value={site.pocName} />
        <PropRow label="POC title" value={site.pocTitle} />
        <PropRow label="POC phone" value={site.pocPhone} />
        <PropRow label="Entry notes" value={site.entryNotes} multiline />
        <Button size="small" sx={{ mt: 2 }} variant="outlined" onClick={() => onEditSiteFromTab(site, 1)}>
          Edit contact & entry
        </Button>
      </TabPanel>

      <TabPanel value={detailTab} index={2}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Includes purchase orders (linked to the PO list) and manual entries from Edit site.
        </Typography>
        {(site.serviceHistoryLog || []).length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No service history yet.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Serviced by</TableCell>
                  <TableCell>PO number</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(site.serviceHistoryLog || []).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.serviceDate || "—"}</TableCell>
                    <TableCell>{row.locationName || "—"}</TableCell>
                    <TableCell>{row.servicedBy || "—"}</TableCell>
                    <TableCell>
                      {row.poNumber ? (
                        <Link
                          href={`#/orders/purchase-list?po=${encodeURIComponent(row.poNumber)}`}
                          underline="hover"
                        >
                          {row.poNumber}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 280, whiteSpace: "normal", wordBreak: "break-word" }}>
                      {row.notes || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <Button size="small" sx={{ mt: 2 }} variant="outlined" onClick={() => onEditSiteFromTab(site, 2)}>
          Edit manual service records
        </Button>
      </TabPanel>

      <TabPanel value={detailTab} index={3}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Planned visits for this site.
        </Typography>
        {(site.scheduledServices || []).length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No scheduled services yet.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(site.scheduledServices || []).map((row, idx) => (
                  <TableRow key={`${row.date}-${idx}`}>
                    <TableCell>{row.date || "—"}</TableCell>
                    <TableCell>{row.notes || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <Button size="small" sx={{ mt: 2 }} variant="outlined" onClick={() => onEditSiteFromTab(site, 3, "schedule")}>
          Edit scheduled services
        </Button>
      </TabPanel>

      <TabPanel value={detailTab} index={4}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Specific places within this site for driver orders (Customer → Site → Location).
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddCircleOutlineIcon fontSize="small" />}
            onClick={() => openCreateSiteLocation(site, customerId)}
          >
            Add location
          </Button>
        </Stack>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Location name</TableCell>
                <TableCell>Kit type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {siteLocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography variant="body2" color="text.secondary">
                      No locations yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                siteLocations.map((loc) => (
                  <TableRow key={loc.id}>
                    <TableCell>{loc.name}</TableCell>
                    <TableCell>{loc.kitTypeName || "—"}</TableCell>
                    <TableCell>{loc.isActive ? "Active" : "Inactive"}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" aria-label="edit location" onClick={() => openEditSiteLocation(loc)}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label="delete location"
                        onClick={() => setDeleteSiteLocationTarget(loc)}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>
    </>
  );
}

function CustomersAdminPage() {
  const [customers, setCustomers] = useState([]);
  const [sitesByCustomer, setSitesByCustomer] = useState({});
  const [siteLocationsBySite, setSiteLocationsBySite] = useState({});
  const [kitTypes, setKitTypes] = useState([]);
  const [customerDialog, setCustomerDialog] = useState({ open: false, form: emptyCustomerForm() });
  const [siteDialog, setSiteDialog] = useState({ open: false, mode: "full", form: emptySiteForm() });
  const [siteTab, setSiteTab] = useState(0);
  const [siteLocationDialog, setSiteLocationDialog] = useState({ open: false, form: emptySiteLocationForm() });
  const [deleteCustomerTarget, setDeleteCustomerTarget] = useState(null);
  const [deleteSiteTarget, setDeleteSiteTarget] = useState(null);
  const [deleteSiteLocationTarget, setDeleteSiteLocationTarget] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [search, setSearch] = useState("");
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);
  /** Nested site accordions: expanded details with tabs */
  const [expandedSites, setExpandedSites] = useState({});
  const [siteDetailTabById, setSiteDetailTabById] = useState({});

  const loadCustomers = useCallback(async () => {
    const list = await listCustomersForAdmin();
    setCustomers(list);
    const siteMap = {};
    const locMap = {};
    await Promise.all(
      list.map(async (c) => {
        const sites = await listSitesForAdmin(c.id);
        siteMap[c.id] = sites;
        await Promise.all(
          sites.map(async (site) => {
            locMap[site.id] = await listSiteLocationsForAdmin(site.id);
          })
        );
      })
    );
    setSitesByCustomer(siteMap);
    setSiteLocationsBySite(locMap);
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    let mounted = true;
    const loadKitTypes = async () => {
      try {
        const list = await listKitTypesForAdmin();
        if (mounted) setKitTypes(list);
      } catch {
        if (mounted) setKitTypes([]);
      }
    };
    loadKitTypes();
    return () => {
      mounted = false;
    };
  }, []);

  const visibleCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return customers;
    }
    return customers.filter((c) => {
      if ((c.name || "").toLowerCase().includes(q)) {
        return true;
      }
      const sites = sitesByCustomer[c.id] || [];
      for (const s of sites) {
        const blob = [
          s.name,
          s.address,
          s.city,
          s.state,
          s.zip,
          s.pocName,
          s.entryNotes,
          s.hoursOfOperation
        ]
          .join(" ")
          .toLowerCase();
        if (blob.includes(q)) return true;
        const locs = siteLocationsBySite[s.id] || [];
        if (locs.some((l) => (l.name || "").toLowerCase().includes(q))) return true;
      }
      return false;
    });
  }, [customers, sitesByCustomer, siteLocationsBySite, search]);

  const openCreateCustomer = () => {
    setCustomerDialog({ open: true, form: emptyCustomerForm() });
    setFeedback({ type: "", message: "" });
  };

  const openEditCustomer = (customer) => {
    setCustomerDialog({
      open: true,
      form: {
        id: customer.id,
        name: customer.name,
        isActive: customer.isActive,
        orderAnyTime: customer.orderAnyTime !== false
      }
    });
    setFeedback({ type: "", message: "" });
  };

  const saveCustomer = async () => {
    const { id, name, isActive, orderAnyTime } = customerDialog.form;
    if (!name.trim()) {
      setFeedback({ type: "error", message: "Customer name is required." });
      return;
    }
    try {
      if (id) {
        await updateCustomer({ id, name, isActive, orderAnyTime });
        setFeedback({ type: "success", message: "Customer updated." });
      } else {
        await createCustomer({ name, isActive, orderAnyTime });
        setFeedback({ type: "success", message: "Customer created." });
      }
      setCustomerDialog({ open: false, form: emptyCustomerForm() });
      await loadCustomers();
    } catch (e) {
      setFeedback({ type: "error", message: e.message || "Save failed." });
    }
  };

  const confirmDeleteCustomer = async () => {
    if (!deleteCustomerTarget) return;
    await deleteCustomer(deleteCustomerTarget.id);
    setDeleteCustomerTarget(null);
    setFeedback({
      type: "success",
      message: `Removed ${deleteCustomerTarget.name} and its sites.`
    });
    await loadCustomers();
  };

  const openCreateSite = (customerId) => {
    setSiteTab(0);
    setSiteDialog({
      open: true,
      form: { ...emptySiteForm(), customerId }
    });
    setFeedback({ type: "", message: "" });
  };

  const openEditSite = (site, initialTab = 0, mode = "full") => {
    const lastServiceDate = computeLastServiceDate({
      historyLog: site.serviceHistoryLog,
      manualHistory: site.serviceHistory
    });
    const nextVisitDate = computeNextVisitDate({
      lastServiceDate,
      serviceFrequency: site.serviceFrequency || ""
    });
    const scheduled = upsertAutoNextVisitRow(site.scheduledServices, nextVisitDate);
    const freqUi = frequencyUiFromStored(site.serviceFrequency || "");

    setSiteTab(mode === "schedule" ? 3 : initialTab);
    setSiteDialog({
      open: true,
      mode,
      form: {
        id: site.id,
        customerId: site.customerId,
        name: site.name,
        address: site.address || "",
        city: site.city || "",
        state: site.state || "",
        zip: site.zip || "",
        pocName: site.pocName || "",
        pocTitle: site.pocTitle || "",
        pocPhone: site.pocPhone || "",
        entryNotes: site.entryNotes || "",
        hoursOfOperation: site.hoursOfOperation || "",
        preferredServiceTimeOfDay: site.preferredServiceTimeOfDay || "",
        serviceFrequency: site.serviceFrequency || "",
        serviceFrequencyCount: freqUi.count,
        serviceFrequencyUnit: freqUi.unit,
        isActive: site.isActive,
        serviceHistory: Array.isArray(site.serviceHistory) ? [...site.serviceHistory] : [],
        scheduledServices: scheduled,
        baseLastServiceDate: lastServiceDate
      }
    });
    setFeedback({ type: "", message: "" });
  };

  const saveSite = async () => {
    const f = siteDialog.form;
    if (!f.name.trim()) {
      setFeedback({ type: "error", message: "Site name is required." });
      return;
    }
    try {
      const normalizedFrequency = formatServiceFrequency(f.serviceFrequencyCount, f.serviceFrequencyUnit);
      if (f.id) {
        await updateSite({ ...f, serviceFrequency: normalizedFrequency });
        setFeedback({ type: "success", message: "Site updated." });
      } else {
        await createSite({
          customerId: f.customerId,
          name: f.name,
          address: f.address,
          city: f.city,
          state: f.state,
          zip: f.zip,
          pocName: f.pocName,
          pocTitle: f.pocTitle,
          pocPhone: f.pocPhone,
          entryNotes: f.entryNotes,
          hoursOfOperation: f.hoursOfOperation,
          preferredServiceTimeOfDay: f.preferredServiceTimeOfDay,
          serviceFrequency: normalizedFrequency,
          isActive: f.isActive,
          serviceHistory: f.serviceHistory,
          scheduledServices: f.scheduledServices
        });
        setFeedback({ type: "success", message: "Site created." });
      }
      setSiteDialog({ open: false, form: emptySiteForm() });
      await loadCustomers();
    } catch (e) {
      setFeedback({ type: "error", message: e.message || "Save failed." });
    }
  };

  const confirmDeleteSite = async () => {
    if (!deleteSiteTarget) return;
    await deleteSite(deleteSiteTarget.id);
    setDeleteSiteTarget(null);
    setFeedback({ type: "success", message: "Site removed." });
    await loadCustomers();
  };

  const openCreateSiteLocation = (site, customerId) => {
    setSiteLocationDialog({
      open: true,
      form: { ...emptySiteLocationForm(), siteId: site.id, customerId }
    });
    setFeedback({ type: "", message: "" });
  };

  const openEditSiteLocation = (loc) => {
    setSiteLocationDialog({
      open: true,
      form: {
        id: loc.id,
        siteId: loc.siteId,
        customerId: loc.customerId,
        name: loc.name,
        kitTypeId: loc.kitTypeId || "",
        isActive: loc.isActive
      }
    });
    setFeedback({ type: "", message: "" });
  };

  const saveSiteLocation = async () => {
    const f = siteLocationDialog.form;
    if (!f.name.trim()) {
      setFeedback({ type: "error", message: "Location name is required." });
      return;
    }
    try {
      if (f.id) {
        await updateSiteLocation({
          ...f,
          kitTypeId: f.kitTypeId || null
        });
        setFeedback({ type: "success", message: "Location updated." });
      } else {
        await createSiteLocation({
          siteId: f.siteId,
          customerId: f.customerId,
          name: f.name,
          kitTypeId: f.kitTypeId || null,
          isActive: f.isActive
        });
        setFeedback({ type: "success", message: "Location created." });
      }
      setSiteLocationDialog({ open: false, form: emptySiteLocationForm() });
      await loadCustomers();
    } catch (e) {
      setFeedback({ type: "error", message: e.message || "Save failed." });
    }
  };

  const confirmDeleteSiteLocation = async () => {
    if (!deleteSiteLocationTarget) return;
    await deleteSiteLocation(deleteSiteLocationTarget.id);
    setDeleteSiteLocationTarget(null);
    setFeedback({ type: "success", message: "Location removed." });
    await loadCustomers();
  };

  const formatAddressLine = (site) => {
    const parts = [site.address, site.city, site.state, site.zip].filter(Boolean);
    return parts.length ? parts.join(", ") : "—";
  };

  return (
    <Card>
      <CardContent sx={{ p: 1.5 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
            <Typography variant="h5" fontWeight={700}>
              Customer Configuration
            </Typography>
            <Button size="small" variant="contained" onClick={openCreateCustomer} sx={{ flexShrink: 0 }}>
              Add customer
            </Button>
          </Stack>

          {feedback.message && !customerDialog.open && !siteDialog.open && !siteLocationDialog.open && (
            <Alert severity={feedback.type === "error" ? "error" : "success"}>{feedback.message}</Alert>
          )}

          <TextField
            size="small"
            fullWidth
            label="Search"
            placeholder="Customer, site, location, address, notes"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Typography variant="caption" color="text.secondary">
            {visibleCustomers.length} of {customers.length} customer{customers.length === 1 ? "" : "s"}. Expand a
            customer to see sites; expand a site for full details and tabs.
          </Typography>

          <Stack spacing={0.5}>
            {visibleCustomers.length === 0 && customers.length > 0 && (
              <Typography variant="body2" color="text.secondary">
                No customers match your search.
              </Typography>
            )}
            {visibleCustomers.map((customer) => (
              <Accordion
                key={customer.id}
                disableGutters
                elevation={0}
                expanded={expandedCustomerId === customer.id}
                onChange={(_, expanded) => {
                  if (expanded) {
                    setExpandedCustomerId(customer.id);
                    const siteIds = (sitesByCustomer[customer.id] || []).map((s) => s.id);
                    setExpandedSites((prev) => {
                      const next = {};
                      for (const id of siteIds) {
                        if (prev[id]) {
                          next[id] = true;
                        }
                      }
                      return next;
                    });
                  } else if (expandedCustomerId === customer.id) {
                    setExpandedCustomerId(null);
                    setExpandedSites({});
                  }
                }}
                sx={{ border: 1, borderColor: "divider" }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ width: "100%", pr: 1 }}>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography component="span" variant="subtitle1" fontWeight={600}>
                        {customer.name}
                      </Typography>
                      {!customer.isActive && (
                        <Chip component="span" size="small" label="Inactive" sx={{ ml: 1 }} />
                      )}
                      {customer.orderAnyTime === false && (
                        <Chip
                          component="span"
                          size="small"
                          label="Schedule required"
                          variant="outlined"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                    <IconButton
                      size="small"
                      aria-label="edit customer"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditCustomer(customer);
                      }}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      aria-label="delete customer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteCustomerTarget(customer);
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, bgcolor: "action.hover" }}>
                  <Stack spacing={2}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{ minHeight: 52 }}
                    >
                      <Typography variant="subtitle2" color="text.secondary">
                        Sites for this customer
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AddCircleOutlineIcon fontSize="small" />}
                        onClick={() => openCreateSite(customer.id)}
                      >
                        Add site
                      </Button>
                    </Stack>

                    {(sitesByCustomer[customer.id] || []).length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No sites yet. Add a site, then add locations within it for driver orders.
                      </Typography>
                    ) : (
                      (sitesByCustomer[customer.id] || []).map((site) => {
                        const detailTab = siteDetailTabById[site.id] ?? 0;
                        const siteLocs = siteLocationsBySite[site.id] || [];
                        return (
                          <Accordion
                            key={site.id}
                            expanded={Boolean(expandedSites[site.id])}
                            onChange={(_, expanded) =>
                              setExpandedSites((prev) => ({ ...prev, [site.id]: expanded }))
                            }
                            disableGutters
                            elevation={0}
                            sx={{
                              border: 1,
                              borderColor: "divider",
                              borderRadius: 1,
                              bgcolor: "background.paper",
                              "&:before": { display: "none" }
                            }}
                          >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Stack direction="row" alignItems="center" spacing={1} sx={{ width: "100%", pr: 1 }}>
                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                  <Typography component="span" variant="subtitle2" fontWeight={700}>
                                    {site.name}
                                  </Typography>
                                  {!site.isActive && (
                                    <Chip component="span" size="small" label="Inactive" sx={{ ml: 1 }} />
                                  )}
                                  <Typography variant="caption" color="text.secondary" display="block" noWrap>
                                    {formatAddressLine(site)}
                                  </Typography>
                                  {(site.pocName || "").trim() ? (
                                    <Typography variant="caption" color="text.secondary" display="block" noWrap>
                                      POC: {site.pocName}
                                    </Typography>
                                  ) : null}
                                </Box>
                                <IconButton
                                  size="small"
                                  aria-label="edit site"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditSite(site, 0);
                                  }}
                                >
                                  <EditOutlinedIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  aria-label="delete site"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteSiteTarget(site);
                                  }}
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </Stack>
                            </AccordionSummary>
                            <AccordionDetails sx={{ pt: 0, px: 1.5, pb: 2, bgcolor: "action.hover" }}>
                              <Tabs
                                value={detailTab}
                                onChange={(_, v) =>
                                  setSiteDetailTabById((prev) => ({ ...prev, [site.id]: v }))
                                }
                                variant="scrollable"
                                scrollButtons="auto"
                                allowScrollButtonsMobile
                                sx={{ borderBottom: 1, borderColor: "divider", minHeight: 40 }}
                              >
                                <Tab label="Address" sx={{ minHeight: 40, py: 0 }} />
                                <Tab label="Contact" sx={{ minHeight: 40, py: 0 }} />
                                <Tab label="History" sx={{ minHeight: 40, py: 0 }} />
                                <Tab label="Schedule" sx={{ minHeight: 40, py: 0 }} />
                                <Tab label="Locations" sx={{ minHeight: 40, py: 0 }} />
                              </Tabs>
                              <SiteDetailTabPanels
                                site={site}
                                customerId={customer.id}
                                detailTab={detailTab}
                                siteLocations={siteLocs}
                                onEditSiteFromTab={openEditSite}
                                openCreateSiteLocation={openCreateSiteLocation}
                                openEditSiteLocation={openEditSiteLocation}
                                setDeleteSiteLocationTarget={setDeleteSiteLocationTarget}
                              />
                              <Divider sx={{ my: 2 }} />
                              <Button size="small" variant="contained" onClick={() => openEditSite(site, detailTab)}>
                                Edit site
                              </Button>
                            </AccordionDetails>
                          </Accordion>
                        );
                      })
                    )}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        </Stack>
      </CardContent>

      <Dialog open={customerDialog.open} onClose={() => setCustomerDialog({ open: false, form: emptyCustomerForm() })} fullWidth maxWidth="xs">
        <DialogTitle>{customerDialog.form.id ? "Edit customer" : "Add customer"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {feedback.message && customerDialog.open && (
              <Alert severity={feedback.type === "error" ? "error" : "success"}>{feedback.message}</Alert>
            )}
            <TextField
              size="small"
              label="Customer name"
              fullWidth
              value={customerDialog.form.name}
              onChange={(e) =>
                setCustomerDialog((prev) => ({
                  ...prev,
                  form: { ...prev.form, name: e.target.value }
                }))
              }
            />
            <TextField
              select
              size="small"
              label="Status"
              fullWidth
              value={customerDialog.form.isActive ? "active" : "inactive"}
              onChange={(e) =>
                setCustomerDialog((prev) => ({
                  ...prev,
                  form: { ...prev.form, isActive: e.target.value === "active" }
                }))
              }
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              label="Order Any Time"
              fullWidth
              value={customerDialog.form.orderAnyTime ? "yes" : "no"}
              onChange={(e) =>
                setCustomerDialog((prev) => ({
                  ...prev,
                  form: { ...prev.form, orderAnyTime: e.target.value === "yes" }
                }))
              }
              helperText={
                customerDialog.form.orderAnyTime
                  ? "Drivers can select this customer on any service date."
                  : "Drivers only see this customer when it is on their route schedule for that day."
              }
            >
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setCustomerDialog({ open: false, form: emptyCustomerForm() })}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={saveCustomer}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={siteDialog.open}
        onClose={() => setSiteDialog({ open: false, mode: "full", form: emptySiteForm() })}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {siteDialog.mode === "schedule"
            ? "Edit service schedule"
            : siteDialog.form.id
              ? "Edit site"
              : "Add site"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={0}>
            {feedback.message && siteDialog.open && (
              <Alert severity={feedback.type === "error" ? "error" : "success"} sx={{ mb: 1 }}>
                {feedback.message}
              </Alert>
            )}
            {siteDialog.mode !== "schedule" ? (
              <Tabs
                value={siteTab}
                onChange={(_, v) => setSiteTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
              >
                <Tab label="Address" />
                <Tab label="Contact" />
                <Tab label="History" />
                <Tab label="Schedule" />
              </Tabs>
            ) : null}

            {siteDialog.mode !== "schedule" ? (
              <TabPanel value={siteTab} index={0}>
              <Stack spacing={2}>
                <TextField
                  size="small"
                  label="Site name"
                  fullWidth
                  required
                  value={siteDialog.form.name}
                  onChange={(e) =>
                    setSiteDialog((prev) => ({ ...prev, form: { ...prev.form, name: e.target.value } }))
                  }
                />
                <TextField
                  size="small"
                  label="Street address"
                  fullWidth
                  value={siteDialog.form.address}
                  onChange={(e) =>
                    setSiteDialog((prev) => ({ ...prev, form: { ...prev.form, address: e.target.value } }))
                  }
                />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    size="small"
                    label="City"
                    fullWidth
                    value={siteDialog.form.city}
                    onChange={(e) =>
                      setSiteDialog((prev) => ({ ...prev, form: { ...prev.form, city: e.target.value } }))
                    }
                  />
                  <TextField
                    size="small"
                    label="State"
                    fullWidth
                    value={siteDialog.form.state}
                    onChange={(e) =>
                      setSiteDialog((prev) => ({ ...prev, form: { ...prev.form, state: e.target.value } }))
                    }
                  />
                  <TextField
                    size="small"
                    label="ZIP"
                    fullWidth
                    value={siteDialog.form.zip}
                    onChange={(e) =>
                      setSiteDialog((prev) => ({ ...prev, form: { ...prev.form, zip: e.target.value } }))
                    }
                  />
                </Stack>
                <TextField
                  size="small"
                  label="Hours of operation"
                  fullWidth
                  value={siteDialog.form.hoursOfOperation}
                  onChange={(e) =>
                    setSiteDialog((prev) => ({
                      ...prev,
                      form: { ...prev.form, hoursOfOperation: e.target.value }
                    }))
                  }
                  placeholder="e.g. Mon–Fri 7:00–17:00"
                />
                <TextField
                  size="small"
                  label="Preferred service time of day"
                  fullWidth
                  value={siteDialog.form.preferredServiceTimeOfDay}
                  onChange={(e) =>
                    setSiteDialog((prev) => ({
                      ...prev,
                      form: { ...prev.form, preferredServiceTimeOfDay: e.target.value }
                    }))
                  }
                  placeholder="e.g. Mornings before 11am"
                />
                <TextField
                  size="small"
                  label="Service frequency"
                  fullWidth
                  value={formatServiceFrequency(siteDialog.form.serviceFrequencyCount, siteDialog.form.serviceFrequencyUnit)}
                  InputProps={{ readOnly: true }}
                  helperText="Configured below. (Example: Every 3 months)"
                />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <TextField
                    select
                    size="small"
                    label="Every"
                    value={siteDialog.form.serviceFrequencyCount}
                    onChange={(e) => {
                      const count = Number(e.target.value);
                      setSiteDialog((prev) => {
                        const frequency = formatServiceFrequency(count, prev.form.serviceFrequencyUnit);
                        const effectiveLast = maxYmd(
                          prev.form.baseLastServiceDate,
                          computeLastServiceDate({ historyLog: [], manualHistory: prev.form.serviceHistory || [] })
                        );
                        const nextVisitDate = computeNextVisitDate({
                          lastServiceDate: effectiveLast,
                          serviceFrequency: frequency
                        });
                        return {
                          ...prev,
                          form: {
                            ...prev.form,
                            serviceFrequencyCount: count,
                            serviceFrequency: frequency,
                            scheduledServices: upsertAutoNextVisitRow(prev.form.scheduledServices, nextVisitDate)
                          }
                        };
                      });
                    }}
                    sx={{ minWidth: 140 }}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                      <MenuItem key={n} value={n}>
                        {n}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    size="small"
                    label="Range"
                    value={siteDialog.form.serviceFrequencyUnit}
                    onChange={(e) => {
                      const unit = e.target.value;
                      setSiteDialog((prev) => {
                        const frequency = formatServiceFrequency(prev.form.serviceFrequencyCount, unit);
                        const effectiveLast = maxYmd(
                          prev.form.baseLastServiceDate,
                          computeLastServiceDate({ historyLog: [], manualHistory: prev.form.serviceHistory || [] })
                        );
                        const nextVisitDate = computeNextVisitDate({
                          lastServiceDate: effectiveLast,
                          serviceFrequency: frequency
                        });
                        return {
                          ...prev,
                          form: {
                            ...prev.form,
                            serviceFrequencyUnit: unit,
                            serviceFrequency: frequency,
                            scheduledServices: upsertAutoNextVisitRow(prev.form.scheduledServices, nextVisitDate)
                          }
                        };
                      });
                    }}
                    sx={{ minWidth: 180 }}
                  >
                    <MenuItem value="days">Days</MenuItem>
                    <MenuItem value="weeks">Weeks</MenuItem>
                    <MenuItem value="months">Months</MenuItem>
                    <MenuItem value="years">Years</MenuItem>
                  </TextField>
                </Stack>
                <TextField
                  select
                  size="small"
                  label="Site status"
                  fullWidth
                  value={siteDialog.form.isActive ? "active" : "inactive"}
                  onChange={(e) =>
                    setSiteDialog((prev) => ({
                      ...prev,
                      form: { ...prev.form, isActive: e.target.value === "active" }
                    }))
                  }
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </TextField>
              </Stack>
              </TabPanel>
            ) : null}

            {siteDialog.mode !== "schedule" ? (
              <TabPanel value={siteTab} index={1}>
              <Stack spacing={2}>
                <TextField
                  size="small"
                  label="Point of contact"
                  fullWidth
                  value={siteDialog.form.pocName}
                  onChange={(e) =>
                    setSiteDialog((prev) => ({ ...prev, form: { ...prev.form, pocName: e.target.value } }))
                  }
                />
                <TextField
                  size="small"
                  label="POC title"
                  fullWidth
                  value={siteDialog.form.pocTitle}
                  onChange={(e) =>
                    setSiteDialog((prev) => ({ ...prev, form: { ...prev.form, pocTitle: e.target.value } }))
                  }
                />
                <TextField
                  size="small"
                  label="POC phone"
                  fullWidth
                  value={siteDialog.form.pocPhone}
                  onChange={(e) =>
                    setSiteDialog((prev) => ({ ...prev, form: { ...prev.form, pocPhone: e.target.value } }))
                  }
                />
                <TextField
                  size="small"
                  label="Entry notes"
                  fullWidth
                  multiline
                  minRows={4}
                  value={siteDialog.form.entryNotes}
                  onChange={(e) =>
                    setSiteDialog((prev) => ({
                      ...prev,
                      form: { ...prev.form, entryNotes: e.target.value }
                    }))
                  }
                  helperText="Directions, gate codes, who to meet—shown to drivers for this site."
                />
              </Stack>
              </TabPanel>
            ) : null}

            {siteDialog.mode !== "schedule" ? (
              <TabPanel value={siteTab} index={2}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Record past service visits for this site (prototype store).
              </Typography>
              {(siteDialog.form.serviceHistory || []).length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No service history yet. Use Add history row.
                </Typography>
              ) : null}
              <Button
                size="small"
                sx={{ mt: 1 }}
                onClick={() =>
                  setSiteDialog((prev) => ({
                    ...prev,
                    form: {
                      ...prev.form,
                      serviceHistory: [
                        ...(prev.form.serviceHistory || []),
                        { date: new Date().toISOString().split("T")[0], summary: "" }
                      ]
                    }
                  }))
                }
              >
                Add history row
              </Button>
              {(siteDialog.form.serviceHistory || []).map((row, idx) => (
                <Stack key={`hist-edit-${idx}`} direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }}>
                  <TextField
                    size="small"
                    type="date"
                    label="Date"
                    value={row.date}
                    onChange={(e) => {
                      const next = [...(siteDialog.form.serviceHistory || [])];
                      next[idx] = { ...next[idx], date: e.target.value };
                      setSiteDialog((prev) => {
                        const effectiveLast = maxYmd(
                          prev.form.baseLastServiceDate,
                          computeLastServiceDate({ historyLog: [], manualHistory: next })
                        );
                        const nextVisitDate = computeNextVisitDate({
                          lastServiceDate: effectiveLast,
                          serviceFrequency: prev.form.serviceFrequency
                        });
                        return {
                          ...prev,
                          form: {
                            ...prev.form,
                            serviceHistory: next,
                            scheduledServices: upsertAutoNextVisitRow(prev.form.scheduledServices, nextVisitDate)
                          }
                        };
                      });
                    }}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    size="small"
                    label="Summary"
                    fullWidth
                    value={row.summary}
                    onChange={(e) => {
                      const next = [...(siteDialog.form.serviceHistory || [])];
                      next[idx] = { ...next[idx], summary: e.target.value };
                      setSiteDialog((prev) => ({ ...prev, form: { ...prev.form, serviceHistory: next } }));
                    }}
                  />
                </Stack>
              ))}
              </TabPanel>
            ) : null}

            <TabPanel value={siteTab} index={3}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Planned visits for this site (prototype store).
              </Typography>
              {(siteDialog.form.scheduledServices || []).length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No scheduled services yet. Use Add scheduled row.
                </Typography>
              ) : null}
              <Button
                size="small"
                sx={{ mt: 1 }}
                onClick={() =>
                  setSiteDialog((prev) => ({
                    ...prev,
                    form: {
                      ...prev.form,
                      scheduledServices: [
                        ...(prev.form.scheduledServices || []),
                        { date: new Date().toISOString().split("T")[0], notes: "" }
                      ]
                    }
                  }))
                }
              >
                Add scheduled row
              </Button>
              {(siteDialog.form.scheduledServices || []).map((row, idx) => (
                <Stack key={`sched-edit-${idx}`} direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }}>
                  <TextField
                    size="small"
                    type="date"
                    label="Date"
                    value={row.date}
                    onChange={(e) => {
                      const next = [...(siteDialog.form.scheduledServices || [])];
                      next[idx] = { ...next[idx], date: e.target.value };
                      setSiteDialog((prev) => ({ ...prev, form: { ...prev.form, scheduledServices: next } }));
                    }}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    size="small"
                    label="Notes"
                    fullWidth
                    value={row.notes}
                    onChange={(e) => {
                      const next = [...(siteDialog.form.scheduledServices || [])];
                      next[idx] = { ...next[idx], notes: e.target.value };
                      setSiteDialog((prev) => ({ ...prev, form: { ...prev.form, scheduledServices: next } }));
                    }}
                  />
                </Stack>
              ))}
            </TabPanel>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setSiteDialog({ open: false, mode: "full", form: emptySiteForm() })}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={saveSite}>
            {siteDialog.mode === "schedule" ? "Save schedule" : "Save site"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={siteLocationDialog.open}
        onClose={() => setSiteLocationDialog({ open: false, form: emptySiteLocationForm() })}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{siteLocationDialog.form.id ? "Edit location" : "Add location"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {feedback.message && siteLocationDialog.open && (
              <Alert severity={feedback.type === "error" ? "error" : "success"}>{feedback.message}</Alert>
            )}
            <TextField
              size="small"
              label="Location name"
              fullWidth
              required
              value={siteLocationDialog.form.name}
              onChange={(e) =>
                setSiteLocationDialog((prev) => ({
                  ...prev,
                  form: { ...prev.form, name: e.target.value }
                }))
              }
              helperText="A specific place within the site (e.g. dock, stockroom)."
            />
            <TextField
              select
              size="small"
              label="Kit type"
              fullWidth
              value={siteLocationDialog.form.kitTypeId}
              onChange={(e) =>
                setSiteLocationDialog((prev) => ({
                  ...prev,
                  form: { ...prev.form, kitTypeId: e.target.value }
                }))
              }
              helperText="Optional. Choose what kind of kit lives at this location."
            >
              <MenuItem value="">None</MenuItem>
              {kitTypes
                .filter((kt) => kt.isActive)
                .map((kt) => (
                  <MenuItem key={kt.id} value={kt.id}>
                    {kt.name}
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Status"
              fullWidth
              value={siteLocationDialog.form.isActive ? "active" : "inactive"}
              onChange={(e) =>
                setSiteLocationDialog((prev) => ({
                  ...prev,
                  form: { ...prev.form, isActive: e.target.value === "active" }
                }))
              }
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setSiteLocationDialog({ open: false, form: emptySiteLocationForm() })}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={saveSiteLocation}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteCustomerTarget)} onClose={() => setDeleteCustomerTarget(null)}>
        <DialogTitle>Delete customer?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Remove <strong>{deleteCustomerTarget?.name}</strong> and all of its sites and locations? This cannot be undone in
            the prototype store.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setDeleteCustomerTarget(null)}>
            Cancel
          </Button>
          <Button size="small" color="error" variant="contained" onClick={confirmDeleteCustomer}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteSiteTarget)} onClose={() => setDeleteSiteTarget(null)}>
        <DialogTitle>Delete site?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Remove <strong>{deleteSiteTarget?.name}</strong> and all locations under it?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setDeleteSiteTarget(null)}>
            Cancel
          </Button>
          <Button size="small" color="error" variant="contained" onClick={confirmDeleteSite}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteSiteLocationTarget)} onClose={() => setDeleteSiteLocationTarget(null)}>
        <DialogTitle>Delete location?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Remove <strong>{deleteSiteLocationTarget?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setDeleteSiteLocationTarget(null)}>
            Cancel
          </Button>
          <Button size="small" color="error" variant="contained" onClick={confirmDeleteSiteLocation}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

export default CustomersAdminPage;
