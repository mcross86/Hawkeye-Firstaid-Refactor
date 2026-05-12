import { useCallback, useEffect, useMemo, useState } from "react";
import {
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
import * as scheduleApi from "../services/api/scheduleApi";
import * as masterDataApi from "../services/api/masterDataApi";
import * as usersApi from "../services/api/usersApi";

function ScheduleAdminPage() {
  const [rows, setRows] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({
    id: null,
    driverId: "",
    serviceDate: new Date().toISOString().split("T")[0],
    customerIds: []
  });
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [scheduleRows, custRows, userRows] = await Promise.all([
        scheduleApi.listSchedule(),
        masterDataApi.listCustomers(),
        usersApi.listUsers()
      ]);
      setRows(scheduleRows);
      setCustomers(custRows.filter((c) => c.isActive));
      setDrivers(userRows.filter((u) => u.role === "driver" && u.isActive));
    } catch (e) {
      setError(e.message || "Failed to load schedule.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const customerNameById = useMemo(
    () =>
      customers.reduce((acc, c) => {
        acc[c.id] = c.name;
        return acc;
      }, {}),
    [customers]
  );

  const openCreate = () => {
    setForm({
      id: null,
      driverId: drivers[0]?.id || "",
      serviceDate: new Date().toISOString().split("T")[0],
      customerIds: []
    });
    setDialogOpen(true);
    setFeedback({ type: "", message: "" });
  };

  const openEdit = (row) => {
    setForm({
      id: row.id,
      driverId: row.driverId,
      serviceDate: row.serviceDate,
      customerIds: [...(row.customerIds || [])]
    });
    setDialogOpen(true);
    setFeedback({ type: "", message: "" });
  };

  const toggleCustomer = (customerId) => {
    setForm((prev) => {
      const set = new Set(prev.customerIds);
      if (set.has(customerId)) {
        set.delete(customerId);
      } else {
        set.add(customerId);
      }
      return { ...prev, customerIds: [...set] };
    });
  };

  const handleSave = async () => {
    if (!form.driverId || !form.serviceDate) {
      setFeedback({ type: "error", message: "Driver and service date are required." });
      return;
    }
    try {
      if (form.id) {
        await scheduleApi.updateScheduleRow(form.id, {
          driverId: form.driverId,
          serviceDate: form.serviceDate,
          customerIds: form.customerIds
        });
        setFeedback({ type: "success", message: "Schedule updated." });
      } else {
        await scheduleApi.createScheduleRow({
          driverId: form.driverId,
          serviceDate: form.serviceDate,
          customerIds: form.customerIds
        });
        setFeedback({ type: "success", message: "Schedule row added." });
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      setFeedback({ type: "error", message: e.message || "Save failed." });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await scheduleApi.deleteScheduleRow(deleteTarget.id);
      setDeleteTarget(null);
      setFeedback({ type: "success", message: "Schedule row removed." });
      await load();
    } catch (e) {
      setFeedback({ type: "error", message: e.message || "Delete failed." });
    }
  };

  return (
    <Card>
      <CardContent sx={{ p: 1.5 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Driver route schedule
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 640 }}>
                Configure which customers appear on Customer Replen Order for each driver and service date.
              </Typography>
            </Box>
            <Button size="small" variant="contained" onClick={openCreate} sx={{ flexShrink: 0 }}>
              Add schedule row
            </Button>
          </Stack>

          {feedback.message && !dialogOpen && (
            <Alert severity={feedback.type === "error" ? "error" : "success"}>{feedback.message}</Alert>
          )}
          {error && <Alert severity="error">{error}</Alert>}

          <TableContainer sx={{ maxWidth: "100%", overflowX: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Driver</TableCell>
                  <TableCell>Service date</TableCell>
                  <TableCell>Customers</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" color="text.secondary">
                        Loading…
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Typography variant="body2" color="text.secondary">
                        No schedule rows yet.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    const driver = drivers.find((d) => d.id === row.driverId);
                    return (
                      <TableRow key={row.id} hover>
                        <TableCell>{driver?.name || row.driverId}</TableCell>
                        <TableCell>{row.serviceDate}</TableCell>
                        <TableCell sx={{ maxWidth: 420 }}>
                          <Stack direction="row" gap={0.5} flexWrap="wrap" useFlexGap>
                            {(row.customerIds || []).map((cid) => (
                              <Chip
                                key={cid}
                                size="small"
                                label={customerNameById[cid] || cid}
                                variant="outlined"
                              />
                            ))}
                            {!(row.customerIds || []).length ? (
                              <Typography variant="caption" color="text.secondary">
                                No customers
                              </Typography>
                            ) : null}
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" aria-label="edit schedule" onClick={() => openEdit(row)}>
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            aria-label="delete schedule"
                            onClick={() => setDeleteTarget(row)}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </CardContent>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{form.id ? "Edit schedule row" : "Add schedule row"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {feedback.message && dialogOpen && (
              <Alert severity={feedback.type === "error" ? "error" : "success"}>{feedback.message}</Alert>
            )}
            <TextField
              select
              size="small"
              label="Driver"
              fullWidth
              value={form.driverId}
              onChange={(e) => setForm((prev) => ({ ...prev, driverId: e.target.value }))}
            >
              {drivers.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              type="date"
              label="Service date"
              fullWidth
              value={form.serviceDate}
              onChange={(e) => setForm((prev) => ({ ...prev, serviceDate: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Box>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Scheduled customers
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Toggle active customers to include on the route for this day.
              </Typography>
              <Stack spacing={0.5}>
                {customers.map((c) => (
                  <Button
                    key={c.id}
                    size="small"
                    variant={form.customerIds.includes(c.id) ? "contained" : "outlined"}
                    onClick={() => toggleCustomer(c.id)}
                    sx={{ justifyContent: "flex-start" }}
                  >
                    {c.name}
                  </Button>
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={handleSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete schedule row?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Remove schedule for driver <strong>{deleteTarget?.driverId}</strong> on{" "}
            <strong>{deleteTarget?.serviceDate}</strong>?
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

export default ScheduleAdminPage;
