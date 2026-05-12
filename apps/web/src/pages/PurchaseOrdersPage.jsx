import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { listPurchaseOrders, updatePurchaseOrder } from "../services/api/purchaseOrderApi";
import { listItemsForAdmin } from "../features/item/services/itemDirectoryService";

const SORTABLE_COLUMNS = [
  { key: "poNumber", label: "PO Number" },
  { key: "poLineNo", label: "PO Line No" },
  { key: "customer", label: "Customer" },
  { key: "location", label: "Location" },
  { key: "sku", label: "SKU" },
  { key: "description", label: "Description" },
  { key: "qty", label: "Qty", align: "right" },
  { key: "notes", label: "Notes" },
  { key: "status", label: "Status" },
  { key: "createdAt", label: "Create Date/Time" },
  { key: "actions", label: "Actions" }
];

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function formatDateYmd(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function asCsvCell(value) {
  const raw = String(value ?? "");
  const escaped = raw.replace(/"/g, "\"\"");
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

function downloadCsv(rows) {
  const headers = [
    "PO Number",
    "PO Line No",
    "Customer",
    "Location",
    "SKU",
    "Description",
    "Qty",
    "Notes",
    "Status",
    "Create Date/Time"
  ];
  const lines = [
    headers.map(asCsvCell).join(","),
    ...rows.map((row) =>
      [
        row.poNumber,
        row.poLineNo,
        row.customer,
        row.location,
        row.sku,
        row.description,
        row.qty,
        row.notes,
        row.status,
        formatDateTime(row.createdAt)
      ]
        .map(asCsvCell)
        .join(",")
    )
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `purchase-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function PurchaseOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pageFeedback, setPageFeedback] = useState({ type: "", message: "" });
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [skuFilter, setSkuFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [itemsCatalog, setItemsCatalog] = useState([]);
  const [editDialog, setEditDialog] = useState({ open: false, orderId: null });
  const [editForm, setEditForm] = useState({ status: "submitted", notes: "", items: [] });
  const [editFeedback, setEditFeedback] = useState({ type: "", message: "" });
  const [saving, setSaving] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await listPurchaseOrders();
      setOrders(rows);
    } catch (e) {
      setError(e.message || "Failed to load purchase orders.");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    let mounted = true;
    const loadItems = async () => {
      try {
        const list = await listItemsForAdmin();
        if (mounted) setItemsCatalog(list);
      } catch {
        if (mounted) setItemsCatalog([]);
      }
    };
    loadItems();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const qIndex = hash.indexOf("?");
    if (qIndex === -1) return;
    const params = new URLSearchParams(hash.slice(qIndex + 1));
    const po = params.get("po");
    if (po) {
      setSearch(po);
    }
  }, []);

  const flattenedRows = useMemo(
    () =>
      orders.flatMap((order) => {
        const items = Array.isArray(order.items) ? order.items : [];
        const combinedSite = order.siteName || "—";
        const parts = String(combinedSite).split(" — ");
        const siteKey = (parts[0] || "—").trim() || "—";
        const locationKey = (parts.slice(1).join(" — ") || "—").trim() || "—";
        return items.map((item, index) => ({
          poNumber: `PO-${order.id}`,
          poLineNo: index + 1,
          orderId: order.id,
          customer: order.customerName || "—",
          location: order.siteName || "—",
          sku: item.sku || "—",
          description: item.itemDescription || "—",
          qty: item.quantity ?? "—",
          notes: order.notes || "—",
          status: order.status || "submitted",
          createdAt: order.createdAt,
          createdDate: formatDateYmd(order.createdAt),
          customerKey: order.customerName || "—",
          siteKey,
          locationKey
        }));
      }),
    [orders]
  );

  const customerOptions = useMemo(() => {
    const seen = new Set();
    const values = [];
    for (const row of flattenedRows) {
      const key = row.customerKey || "—";
      if (seen.has(key)) continue;
      seen.add(key);
      values.push(key);
    }
    values.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return values;
  }, [flattenedRows]);

  const siteOptions = useMemo(() => {
    const seen = new Set();
    const values = [];
    for (const row of flattenedRows) {
      if (!customerFilter) continue;
      if (row.customerKey !== customerFilter) continue;
      const key = row.siteKey || "—";
      if (seen.has(key)) continue;
      seen.add(key);
      values.push(key);
    }
    values.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return values;
  }, [flattenedRows, customerFilter]);

  const locationOptions = useMemo(() => {
    const seen = new Set();
    const values = [];
    for (const row of flattenedRows) {
      if (!customerFilter) continue;
      if (row.customerKey !== customerFilter) continue;
      if (!siteFilter) continue;
      if (row.siteKey !== siteFilter) continue;
      const key = row.locationKey || "—";
      if (seen.has(key)) continue;
      seen.add(key);
      values.push(key);
    }
    values.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return values;
  }, [flattenedRows, customerFilter, siteFilter]);

  const skuOptions = useMemo(() => {
    const seen = new Set();
    const values = [];
    for (const row of flattenedRows) {
      const sku = row.sku || "—";
      if (seen.has(sku)) continue;
      seen.add(sku);
      values.push(sku);
    }
    values.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return values;
  }, [flattenedRows]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return flattenedRows.filter((row) => {
      if (fromDate && row.createdDate && row.createdDate < fromDate) return false;
      if (toDate && row.createdDate && row.createdDate > toDate) return false;
      if (customerFilter && row.customerKey !== customerFilter) return false;
      if (siteFilter && row.siteKey !== siteFilter) return false;
      if (locationFilter && row.locationKey !== locationFilter) return false;
      if (skuFilter && row.sku !== skuFilter) return false;
      if (!q) return true;
      return [row.poNumber, row.customer, row.location, row.sku, row.description, row.notes, row.status]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [flattenedRows, search, fromDate, toDate, customerFilter, siteFilter, locationFilter, skuFilter]);

  const sortedRows = useMemo(() => {
    const rows = [...visibleRows];
    rows.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      if (sortBy === "qty" || sortBy === "poLineNo") {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else if (sortBy === "createdAt") {
        aValue = new Date(aValue).getTime() || 0;
        bValue = new Date(bValue).getTime() || 0;
      } else {
        aValue = String(aValue ?? "").toLowerCase();
        bValue = String(bValue ?? "").toLowerCase();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [visibleRows, sortBy, sortDirection]);

  const handleSort = (columnKey) => {
    if (columnKey === "actions") {
      return;
    }
    if (sortBy === columnKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(columnKey);
    setSortDirection("asc");
  };

  const skuToName = useMemo(() => {
    const map = {};
    for (const it of itemsCatalog) {
      map[String(it.sku)] = it.name;
    }
    return map;
  }, [itemsCatalog]);

  const openEdit = (orderId) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      return;
    }
    if (String(order.status || "").toLowerCase() === "invoiced") {
      setError("This purchase order is invoiced and can no longer be edited.");
      return;
    }
    setPageFeedback({ type: "", message: "" });
    setEditDialog({ open: true, orderId });
    setEditFeedback({ type: "", message: "" });
    setEditForm({
      status: order.status || "submitted",
      notes: order.notes || "",
      items: (order.items || []).map((it) => ({
        sku: it.sku || "",
        itemDescription: it.itemDescription || skuToName[String(it.sku)] || "",
        quantity: it.quantity ?? "",
        isAddOn: Boolean(it.isAddOn)
      }))
    });
  };

  const closeEdit = () => {
    setEditDialog({ open: false, orderId: null });
    setEditFeedback({ type: "", message: "" });
    setSaving(false);
  };

  const updateLine = (index, field, value) => {
    setEditForm((prev) => {
      const items = [...prev.items];
      const line = { ...items[index], [field]: value };
      if (field === "sku") {
        line.itemDescription = skuToName[String(value)] || "";
      }
      items[index] = line;
      return { ...prev, items };
    });
  };

  const addLine = () => {
    setEditForm((prev) => ({
      ...prev,
      items: [...prev.items, { sku: "", itemDescription: "", quantity: "", isAddOn: false }]
    }));
  };

  const removeLine = (index) => {
    setEditForm((prev) => {
      const items = prev.items.filter((_, i) => i !== index);
      return { ...prev, items: items.length ? items : prev.items };
    });
  };

  const saveEdit = async () => {
    if (!editDialog.orderId) return;
    const cleaned = (editForm.items || [])
      .map((it) => ({
        sku: String(it.sku || "").trim(),
        itemDescription: it.itemDescription || "",
        quantity: Number(it.quantity),
        isAddOn: Boolean(it.isAddOn)
      }))
      .filter((it) => it.sku && Number.isFinite(it.quantity) && it.quantity > 0);

    if (cleaned.length === 0) {
      setEditFeedback({ type: "error", message: "Add at least one line with SKU and Qty > 0." });
      return;
    }

    setSaving(true);
    try {
      const updated = await updatePurchaseOrder(editDialog.orderId, {
        status: editForm.status,
        notes: editForm.notes,
        items: cleaned
      });
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      closeEdit();
      setPageFeedback({ type: "success", message: `PO-${updated.id} updated.` });
    } catch (e) {
      setEditFeedback({ type: "error", message: e.message || "Save failed." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="h5" fontWeight={700}>
        Purchase Order List
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
        <TextField
          size="small"
          type="date"
          label="From"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          size="small"
          type="date"
          label="To"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          size="small"
          select
          sx={{ minWidth: 220 }}
          label="Customer"
          value={customerFilter}
          onChange={(e) => {
            setCustomerFilter(e.target.value);
            setSiteFilter("");
            setLocationFilter("");
          }}
        >
          <MenuItem value="">All customers</MenuItem>
          {customerOptions.map((name) => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          select
          sx={{ minWidth: 220 }}
          label="Site"
          value={siteFilter}
          onChange={(e) => {
            setSiteFilter(e.target.value);
            setLocationFilter("");
          }}
          disabled={!customerFilter}
        >
          <MenuItem value="">All sites</MenuItem>
          {siteOptions.map((name) => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          select
          sx={{ minWidth: 220 }}
          label="Location"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          disabled={!customerFilter || !siteFilter}
        >
          <MenuItem value="">All locations</MenuItem>
          {locationOptions.map((name) => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          select
          sx={{ minWidth: 200 }}
          label="SKU"
          value={skuFilter}
          onChange={(e) => setSkuFilter(e.target.value)}
        >
          <MenuItem value="">All SKUs</MenuItem>
          {skuOptions.map((sku) => (
            <MenuItem key={sku} value={sku}>
              {sku}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
        <TextField
          size="small"
          fullWidth
          label="Search"
          placeholder="PO, customer, location, SKU, notes, status"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          size="small"
          variant="contained"
          sx={{ minWidth: 110 }}
          onClick={() => downloadCsv(sortedRows)}
          disabled={loading || !sortedRows.length}
        >
          Export CSV
        </Button>
        <Button size="small" variant="outlined" sx={{ minWidth: 110 }} onClick={loadOrders} disabled={loading}>
          Refresh
        </Button>
      </Stack>

      <Typography variant="caption" color="text.secondary">
        Showing {sortedRows.length} of {flattenedRows.length} line items.
      </Typography>

      {pageFeedback.message ? (
        <Alert severity={pageFeedback.type === "error" ? "error" : "success"}>{pageFeedback.message}</Alert>
      ) : null}

      {error ? <Alert severity="error">{error}</Alert> : null}

      <TableContainer component={Card} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              {SORTABLE_COLUMNS.map((col) => (
                <TableCell key={col.key} align={col.align || "left"}>
                  {col.key === "actions" ? (
                    col.label
                  ) : (
                    <TableSortLabel
                      active={sortBy === col.key}
                      direction={sortBy === col.key ? sortDirection : "asc"}
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                    </TableSortLabel>
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11}>
                  <Typography variant="body2" color="text.secondary">
                    Loading purchase orders...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : sortedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11}>
                  <Typography variant="body2" color="text.secondary">
                    No purchase order lines found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedRows.map((row, idx) => (
                <TableRow key={`${row.poNumber}-${row.poLineNo}-${idx}`}>
                  <TableCell>{row.poNumber}</TableCell>
                  <TableCell>{row.poLineNo}</TableCell>
                  <TableCell>{row.customer}</TableCell>
                  <TableCell>{row.location}</TableCell>
                  <TableCell>{row.sku}</TableCell>
                  <TableCell>{row.description}</TableCell>
                  <TableCell align="right">{row.qty}</TableCell>
                  <TableCell sx={{ maxWidth: 220, whiteSpace: "normal", wordBreak: "break-word" }}>
                    {row.notes}
                  </TableCell>
                  <TableCell sx={{ textTransform: "capitalize" }}>{row.status}</TableCell>
                  <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      aria-label="edit purchase order"
                      onClick={() => openEdit(row.orderId)}
                      disabled={String(row.status || "").toLowerCase() === "invoiced"}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={editDialog.open} onClose={closeEdit} fullWidth maxWidth="md">
        <DialogTitle>Edit purchase order {editDialog.orderId ? `PO-${editDialog.orderId}` : ""}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {editFeedback.message ? (
              <Alert severity={editFeedback.type === "error" ? "error" : "success"}>{editFeedback.message}</Alert>
            ) : null}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
              <TextField
                select
                size="small"
                label="Status"
                value={editForm.status}
                onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="submitted">Submitted</MenuItem>
                <MenuItem value="invoiced">Invoiced (locks edits)</MenuItem>
              </TextField>
              <TextField
                size="small"
                label="Notes"
                fullWidth
                value={editForm.notes}
                onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </Stack>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>SKU</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Remove</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(editForm.items || []).map((line, index) => (
                  <TableRow key={`${index}-${line.sku}`}>
                    <TableCell sx={{ minWidth: 240 }}>
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={line.sku}
                        onChange={(e) => updateLine(index, "sku", e.target.value)}
                      >
                        <MenuItem value="">Select SKU</MenuItem>
                        {itemsCatalog.map((it) => (
                          <MenuItem key={it.id} value={it.sku}>
                            {it.sku} - {it.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>{line.itemDescription || "—"}</TableCell>
                    <TableCell align="right" sx={{ width: 140 }}>
                      <TextField
                        size="small"
                        type="number"
                        inputProps={{ min: 0 }}
                        value={line.quantity}
                        onChange={(e) => updateLine(index, "quantity", e.target.value)}
                        sx={{ width: 120 }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ width: 80 }}>
                      <IconButton
                        size="small"
                        aria-label="remove line"
                        onClick={() => removeLine(index)}
                        disabled={(editForm.items || []).length <= 1}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Button
              size="small"
              variant="text"
              startIcon={<AddCircleOutlineIcon fontSize="small" />}
              onClick={addLine}
              sx={{ alignSelf: "flex-start" }}
            >
              Add line
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={closeEdit} disabled={saving}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={saveEdit} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export default PurchaseOrdersPage;
