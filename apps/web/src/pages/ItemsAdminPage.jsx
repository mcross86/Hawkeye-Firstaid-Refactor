import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
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
  TextField,
  Typography
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { getItemCategories } from "../features/item/services/itemCatalogService";
import {
  buildItemCatalogExportCsv,
  buildItemImportTemplateCsv,
  createItem,
  deleteItem,
  importItemsFromCsvText,
  listItemsForAdmin,
  updateItem
} from "../features/item/services/itemDirectoryService";

function triggerDownload(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

const emptyForm = () => ({
  id: "",
  sku: "",
  name: "",
  categoryId: "",
  isActive: true,
  uom: "EA",
  notes: "",
  listPriceUsd: ""
});

function ItemsAdminPage({ onCatalogChanged }) {
  const fileInputRef = useRef(null);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryNameById, setCategoryNameById] = useState({});
  const [dialog, setDialog] = useState({ open: false, form: emptyForm() });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const [list, cats] = await Promise.all([listItemsForAdmin(), getItemCategories()]);
    setItems(list);
    setCategories(cats);
    setCategoryNameById(Object.fromEntries(cats.map((c) => [c.id, c.name])));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const blob = [
        item.sku,
        item.name,
        item.notes,
        item.uom,
        item.categoryId,
        categoryNameById[item.categoryId],
        item.listPriceUsd != null && Number.isFinite(Number(item.listPriceUsd))
          ? String(item.listPriceUsd)
          : ""
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [items, categoryNameById, search]);

  const notifyCatalogChanged = () => {
    onCatalogChanged?.();
    load();
  };

  const handleDownloadTemplate = () => {
    triggerDownload("hawkeye-item-import-template.csv", buildItemImportTemplateCsv());
    setFeedback({ type: "success", message: "Template downloaded." });
  };

  const handleExportCatalog = async () => {
    const list = await listItemsForAdmin();
    const csv = buildItemCatalogExportCsv(list);
    const stamp = new Date().toISOString().slice(0, 10);
    triggerDownload(`hawkeye-item-catalog-${stamp}.csv`, csv);
    setFeedback({ type: "success", message: "Catalog exported." });
  };

  const handlePickImportFile = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const result = await importItemsFromCsvText(text);
      if (result.errors.length) {
        setFeedback({
          type: "error",
          message: `${result.errors.slice(0, 5).join(" ")}${result.errors.length > 5 ? " …" : ""}`
        });
        return;
      }
      setFeedback({
        type: "success",
        message: `Import complete. Created ${result.created}, updated ${result.updated}.`
      });
      notifyCatalogChanged();
    } catch (e) {
      setFeedback({ type: "error", message: e.message || "Import failed." });
    }
  };

  const openCreate = () => {
    const firstCat = categories[0]?.id || "";
    setDialog({ open: true, form: { ...emptyForm(), categoryId: firstCat } });
    setFeedback({ type: "", message: "" });
  };

  const openEdit = (item) => {
    setDialog({
      open: true,
      form: {
        id: item.id,
        sku: item.sku,
        name: item.name,
        categoryId: item.categoryId,
        isActive: item.isActive,
        uom: item.uom || "EA",
        notes: item.notes || "",
        listPriceUsd:
          item.listPriceUsd != null && Number.isFinite(Number(item.listPriceUsd))
            ? String(item.listPriceUsd)
            : ""
      }
    });
    setFeedback({ type: "", message: "" });
  };

  const saveItem = async () => {
    const f = dialog.form;
    if (!f.sku.trim() || !f.name.trim() || !f.categoryId.trim()) {
      setFeedback({ type: "error", message: "SKU, Description, and Product Category are required." });
      return;
    }
    try {
      const rawPrice = String(f.listPriceUsd ?? "").trim();
      const parsedPrice = rawPrice === "" ? null : Number(rawPrice);
      const listPriceUsd = parsedPrice != null && Number.isFinite(parsedPrice) ? parsedPrice : null;
      if (f.id) {
        await updateItem({
          ...f,
          listPriceUsd
        });
        setFeedback({ type: "success", message: "Item updated." });
      } else {
        await createItem({
          sku: f.sku,
          name: f.name,
          categoryId: f.categoryId,
          isActive: f.isActive,
          uom: f.uom,
          notes: f.notes,
          listPriceUsd
        });
        setFeedback({ type: "success", message: "Item created." });
      }
      setDialog({ open: false, form: emptyForm() });
      notifyCatalogChanged();
    } catch (e) {
      setFeedback({ type: "error", message: e.message || "Save failed." });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteItem(deleteTarget.id);
    setDeleteTarget(null);
    setFeedback({ type: "success", message: `Removed SKU ${deleteTarget.sku}.` });
    notifyCatalogChanged();
  };

  return (
    <Card>
      <CardContent sx={{ p: 1.5 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
            <Typography variant="h5" fontWeight={700}>
              Items Configuration
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DescriptionOutlinedIcon fontSize="small" />}
                onClick={handleDownloadTemplate}
              >
                Download template
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadOutlinedIcon fontSize="small" />}
                onClick={handleExportCatalog}
              >
                Export catalog
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<UploadFileOutlinedIcon fontSize="small" />}
                onClick={handlePickImportFile}
              >
                Upload CSV
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                hidden
                onChange={handleImportFile}
              />
              <Button size="small" variant="contained" onClick={openCreate}>
                Add item
              </Button>
            </Stack>
          </Stack>

          {feedback.message && !dialog.open && (
            <Alert severity={feedback.type === "error" ? "error" : "success"}>{feedback.message}</Alert>
          )}

          <TextField
            size="small"
            fullWidth
            label="Search"
            placeholder="SKU, description, category, UOM, notes, price"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <Typography variant="caption" color="text.secondary">
            {visibleItems.length} of {items.length} item{items.length === 1 ? "" : "s"}.
          </Typography>

          <TableContainer sx={{ maxWidth: "100%", overflowX: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>SKU</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>UOM</TableCell>
                  <TableCell align="right">List price</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleItems.length === 0 && items.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Typography variant="body2" color="text.secondary">
                        No items match your search.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {visibleItems.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>{item.sku}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      <Typography variant="body2" component="span">
                        {categoryNameById[item.categoryId] || item.categoryId}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {item.categoryId}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.uom || "EA"}</TableCell>
                    <TableCell align="right">
                      {item.listPriceUsd != null && Number.isFinite(Number(item.listPriceUsd))
                        ? Number(item.listPriceUsd).toFixed(2)
                        : "—"}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>{item.notes || "—"}</TableCell>
                    <TableCell>
                      {item.isActive ? (
                        <Chip size="small" label="Active" color="success" variant="outlined" />
                      ) : (
                        <Chip size="small" label="Inactive" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" aria-label="edit item" onClick={() => openEdit(item)}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" aria-label="delete item" onClick={() => setDeleteTarget(item)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </CardContent>

      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, form: emptyForm() })} fullWidth maxWidth="sm">
        <DialogTitle>{dialog.form.id ? "Edit item" : "Add item"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {feedback.message && dialog.open && (
              <Alert severity={feedback.type === "error" ? "error" : "success"}>{feedback.message}</Alert>
            )}
            <TextField
              size="small"
              label="SKU"
              fullWidth
              value={dialog.form.sku}
              onChange={(e) => setDialog((prev) => ({ ...prev, form: { ...prev.form, sku: e.target.value } }))}
              disabled={Boolean(dialog.form.id)}
              helperText={dialog.form.id ? "SKU cannot be changed after create." : ""}
            />
            <TextField
              size="small"
              label="Description"
              fullWidth
              value={dialog.form.name}
              onChange={(e) => setDialog((prev) => ({ ...prev, form: { ...prev.form, name: e.target.value } }))}
            />
            <TextField
              size="small"
              label="Product category (CategoryId)"
              fullWidth
              value={dialog.form.categoryId}
              onChange={(e) =>
                setDialog((prev) => ({ ...prev, form: { ...prev.form, categoryId: e.target.value.trim() } }))
              }
              helperText={`Known ids include: ${categories
                .slice(0, 5)
                .map((c) => c.id)
                .join(", ")}${categories.length > 5 ? ", …" : ""}`}
            />
            <TextField
              size="small"
              label="Unit of measure (UOM)"
              fullWidth
              value={dialog.form.uom}
              onChange={(e) => setDialog((prev) => ({ ...prev, form: { ...prev.form, uom: e.target.value } }))}
              helperText="Default ordering unit (e.g. EA, BX)."
            />
            <TextField
              size="small"
              label="List price (USD)"
              fullWidth
              type="number"
              inputProps={{ min: 0, step: "0.01" }}
              value={dialog.form.listPriceUsd}
              onChange={(e) =>
                setDialog((prev) => ({ ...prev, form: { ...prev.form, listPriceUsd: e.target.value } }))
              }
              helperText="Used for driver performance revenue-style rollups."
            />
            <TextField
              size="small"
              label="Internal notes"
              fullWidth
              multiline
              minRows={2}
              value={dialog.form.notes}
              onChange={(e) => setDialog((prev) => ({ ...prev, form: { ...prev.form, notes: e.target.value } }))}
            />
            <TextField
              select
              size="small"
              label="Status"
              fullWidth
              value={dialog.form.isActive ? "active" : "inactive"}
              onChange={(e) =>
                setDialog((prev) => ({
                  ...prev,
                  form: { ...prev.form, isActive: e.target.value === "active" }
                }))
              }
            >
              <MenuItem value="active">Active (shown on replen orders)</MenuItem>
              <MenuItem value="inactive">Inactive (hidden from drivers)</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setDialog({ open: false, form: emptyForm() })}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={saveItem}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete item?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Remove <strong>{deleteTarget?.sku}</strong> — {deleteTarget?.name}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button size="small" color="error" variant="contained" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

export default ItemsAdminPage;
