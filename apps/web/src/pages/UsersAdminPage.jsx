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
  TableSortLabel,
  TextField,
  Typography
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { USER_ROLES } from "../features/user/data/users";
import {
  createUser,
  deleteUser,
  listUsers,
  updateUser
} from "../features/user/services/userDirectoryService";

const roleLabel = (role) =>
  ({
    admin: "Admin",
    driver: "Driver",
    clerk: "Clerk"
  })[role] || role;

const emptyForm = () => ({
  id: "",
  name: "",
  email: "",
  userIdNumber: "",
  role: "clerk",
  isActive: true
});

function UsersAdminPage({ onUsersChanged }) {
  const [users, setUsers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orderBy, setOrderBy] = useState("name");
  const [order, setOrder] = useState("asc");

  const load = useCallback(async () => {
    const list = await listUsers();
    setUsers(list);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const visibleUsers = useMemo(() => {
    let list = [...users];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) =>
          (u.name || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q) ||
          String(u.userIdNumber || "").toLowerCase().includes(q)
      );
    }
    if (roleFilter !== "all") {
      list = list.filter((u) => u.role === roleFilter);
    }
    if (statusFilter === "active") {
      list = list.filter((u) => u.isActive);
    } else if (statusFilter === "inactive") {
      list = list.filter((u) => !u.isActive);
    }

    const dir = order === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (orderBy) {
        case "name":
          return (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }) * dir;
        case "email":
          return (a.email || "").localeCompare(b.email || "", undefined, { sensitivity: "base" }) * dir;
        case "userIdNumber":
          return (
            String(a.userIdNumber || "").localeCompare(String(b.userIdNumber || ""), undefined, {
              numeric: true
            }) * dir
          );
        case "role":
          return roleLabel(a.role).localeCompare(roleLabel(b.role)) * dir;
        case "isActive": {
          const va = a.isActive ? 1 : 0;
          const vb = b.isActive ? 1 : 0;
          return (va - vb) * dir;
        }
        default:
          return 0;
      }
    });
    return list;
  }, [users, search, roleFilter, statusFilter, orderBy, order]);

  const openCreate = () => {
    setForm({ ...emptyForm(), role: "clerk" });
    setDialogOpen(true);
    setFeedback({ type: "", message: "" });
  };

  const openEdit = (user) => {
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      userIdNumber: user.userIdNumber != null ? String(user.userIdNumber) : "",
      role: user.role,
      isActive: user.isActive
    });
    setDialogOpen(true);
    setFeedback({ type: "", message: "" });
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.userIdNumber.trim()) {
      setFeedback({ type: "error", message: "Name, email, and User ID # are required." });
      return;
    }
    try {
      if (form.id) {
        await updateUser(form);
        setFeedback({ type: "success", message: "User updated." });
      } else {
        await createUser({
          name: form.name,
          email: form.email,
          userIdNumber: form.userIdNumber,
          role: form.role,
          isActive: Boolean(form.isActive)
        });
        setFeedback({ type: "success", message: "User created." });
      }
      setDialogOpen(false);
      await load();
      onUsersChanged?.();
    } catch (e) {
      setFeedback({ type: "error", message: e.message || "Save failed." });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteUser(deleteTarget.id);
    setDeleteTarget(null);
    setFeedback({ type: "success", message: `Removed ${deleteTarget.name}.` });
    await load();
    onUsersChanged?.();
  };

  return (
    <Card>
      <CardContent sx={{ p: 1.5 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                User Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 560 }}>
                Create and manage users. Assign Admin, Driver, or Clerk for configuration, field, and office
                workflows.
              </Typography>
            </Box>
            <Button size="small" variant="contained" onClick={openCreate} sx={{ flexShrink: 0 }}>
              Add user
            </Button>
          </Stack>

          {feedback.message && !dialogOpen && (
            <Alert severity={feedback.type === "error" ? "error" : "success"}>{feedback.message}</Alert>
          )}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap" useFlexGap>
            <TextField
              size="small"
              label="Search"
              placeholder="Name, email, or User ID #"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: { xs: "100%", sm: 220 }, flex: { sm: "1 1 200px" } }}
            />
            <TextField
              select
              size="small"
              label="Role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="all">All roles</MenuItem>
              {USER_ROLES.map((r) => (
                <MenuItem key={r} value={r}>
                  {roleLabel(r)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
          </Stack>

          <Typography variant="caption" color="text.secondary">
            {visibleUsers.length} of {users.length} user{users.length === 1 ? "" : "s"}
          </Typography>

          <TableContainer sx={{ maxWidth: "100%", overflowX: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sortDirection={orderBy === "name" ? order : false}>
                    <TableSortLabel
                      active={orderBy === "name"}
                      direction={orderBy === "name" ? order : "asc"}
                      onClick={() => handleRequestSort("name")}
                    >
                      Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={orderBy === "userIdNumber" ? order : false}>
                    <TableSortLabel
                      active={orderBy === "userIdNumber"}
                      direction={orderBy === "userIdNumber" ? order : "asc"}
                      onClick={() => handleRequestSort("userIdNumber")}
                    >
                      User ID #
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={orderBy === "email" ? order : false}>
                    <TableSortLabel
                      active={orderBy === "email"}
                      direction={orderBy === "email" ? order : "asc"}
                      onClick={() => handleRequestSort("email")}
                    >
                      Email
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={orderBy === "role" ? order : false}>
                    <TableSortLabel
                      active={orderBy === "role"}
                      direction={orderBy === "role" ? order : "asc"}
                      onClick={() => handleRequestSort("role")}
                    >
                      Role
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={orderBy === "isActive" ? order : false}>
                    <TableSortLabel
                      active={orderBy === "isActive"}
                      direction={orderBy === "isActive" ? order : "asc"}
                      onClick={() => handleRequestSort("isActive")}
                    >
                      Status
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleUsers.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.userIdNumber || "—"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{roleLabel(user.role)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={user.isActive ? "Active" : "Inactive"}
                        color={user.isActive ? "success" : "default"}
                        variant={user.isActive ? "filled" : "outlined"}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" aria-label="edit user" onClick={() => openEdit(user)}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label="delete user"
                        onClick={() => setDeleteTarget(user)}
                      >
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{form.id ? "Edit user" : "Add user"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {feedback.message && dialogOpen && (
              <Alert severity={feedback.type === "error" ? "error" : "success"}>{feedback.message}</Alert>
            )}
            <TextField
              size="small"
              label="Name"
              fullWidth
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <TextField
              size="small"
              label="Email"
              type="email"
              fullWidth
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <TextField
              size="small"
              label="User ID #"
              fullWidth
              value={form.userIdNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, userIdNumber: e.target.value }))}
              helperText="Unique per user. Drivers use this with the field login (e.g. Matt Ross / 1234)."
            />
            <TextField
              select
              size="small"
              label="Role"
              fullWidth
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            >
              {USER_ROLES.map((r) => (
                <MenuItem key={r} value={r}>
                  {roleLabel(r)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Status"
              fullWidth
              value={form.isActive ? "active" : "inactive"}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.value === "active" }))}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
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
        <DialogTitle>Delete user?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Remove <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email})? This cannot be undone.
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

export default UsersAdminPage;
