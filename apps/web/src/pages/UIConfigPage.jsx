import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid2 as Grid,
  MenuItem,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import {
  getCategoryDisplayConfig,
  getItemCategories,
  saveCategoryDisplayConfig
} from "../features/item/services/itemCatalogService";

function UIConfigPage({ activeDrivers, onConfigurationSaved }) {
  const [scopeType, setScopeType] = useState("default");
  const [scopeDriverId, setScopeDriverId] = useState("");
  const [allCategories, setAllCategories] = useState([]);
  const [rows, setRows] = useState([]);
  const [draggedCategoryId, setDraggedCategoryId] = useState("");
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const effectiveDriverId = scopeType === "driver" ? scopeDriverId : undefined;

  const categoriesById = useMemo(
    () =>
      allCategories.reduce((acc, category) => {
        acc[category.id] = category;
        return acc;
      }, {}),
    [allCategories]
  );

  useEffect(() => {
    let isMounted = true;
    const loadCategories = async () => {
      const categories = await getItemCategories();
      if (isMounted) {
        setAllCategories(categories);
      }
    };
    loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (scopeType === "driver" && !scopeDriverId && activeDrivers.length) {
      setScopeDriverId(activeDrivers[0].id);
    }
  }, [scopeType, scopeDriverId, activeDrivers]);

  useEffect(() => {
    let isMounted = true;
    const loadConfig = async () => {
      const configRows = await getCategoryDisplayConfig({ driverId: effectiveDriverId });
      if (!isMounted) {
        return;
      }
      const completeRows = allCategories.map((category, index) => {
        const existing = configRows.find((row) => row.categoryId === category.id);
        return (
          existing || {
            categoryId: category.id,
            isEnabled: true,
            sequence: index + 1
          }
        );
      });
      setRows(completeRows.sort((a, b) => a.sequence - b.sequence));
      setFeedback({ type: "", message: "" });
    };

    if (allCategories.length) {
      loadConfig();
    }

    return () => {
      isMounted = false;
    };
  }, [allCategories, effectiveDriverId]);

  const resequenceRows = (inputRows) =>
    inputRows.map((row, index) => ({
      ...row,
      sequence: index + 1
    }));

  const updateRow = (categoryId, field, value) => {
    setRows((prev) =>
      prev.map((row) => (row.categoryId === categoryId ? { ...row, [field]: value } : row))
    );
  };

  const handleDragStart = (categoryId) => {
    setDraggedCategoryId(categoryId);
  };

  const handleDrop = (targetCategoryId) => {
    if (!draggedCategoryId || draggedCategoryId === targetCategoryId) {
      return;
    }

    setRows((prev) => {
      const sourceIndex = prev.findIndex((row) => row.categoryId === draggedCategoryId);
      const targetIndex = prev.findIndex((row) => row.categoryId === targetCategoryId);
      if (sourceIndex < 0 || targetIndex < 0) {
        return prev;
      }
      const reordered = [...prev];
      const [moved] = reordered.splice(sourceIndex, 1);
      reordered.splice(targetIndex, 0, moved);
      return resequenceRows(reordered);
    });
    setDraggedCategoryId("");
  };

  const handleDragEnd = () => {
    setDraggedCategoryId("");
  };

  const handleSave = async () => {
    await saveCategoryDisplayConfig({ driverId: effectiveDriverId, rows });
    setFeedback({ type: "success", message: "Category display configuration saved." });
    onConfigurationSaved();
  };

  return (
    <Card>
      <CardContent sx={{ p: 1.5 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Product Category Display Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 560 }}>
                Choose which categories appear in Customer Replen Order, enable or disable them, and set display
                order by default or for a specific driver.
              </Typography>
            </Box>
            <Button size="small" variant="contained" onClick={handleSave} sx={{ flexShrink: 0 }}>
              Save display configuration
            </Button>
          </Stack>

          {feedback.message && (
            <Alert severity={feedback.type === "error" ? "error" : "success"}>
              {feedback.message}
            </Alert>
          )}

          <Grid container spacing={1}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Configuration scope"
                value={scopeType}
                onChange={(event) => setScopeType(event.target.value)}
              >
                <MenuItem value="default">Default (All Drivers)</MenuItem>
                <MenuItem value="driver">Specific Driver</MenuItem>
              </TextField>
            </Grid>
            {scopeType === "driver" && (
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Driver"
                  value={scopeDriverId}
                  onChange={(event) => setScopeDriverId(event.target.value)}
                >
                  {activeDrivers.map((driver) => (
                    <MenuItem key={driver.id} value={driver.id}>
                      {driver.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
          </Grid>

          <Stack spacing={1}>
            {rows.map((row) => (
              <Grid
                key={row.categoryId}
                container
                spacing={1}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => handleDrop(row.categoryId)}
                sx={{
                  borderRadius: 1,
                  border: draggedCategoryId === row.categoryId ? "1px dashed" : "none",
                  borderColor: draggedCategoryId === row.categoryId ? "primary.main" : undefined,
                  p: 0.5
                }}
              >
                <Grid size={{ xs: 1, sm: 1 }} display="flex" alignItems="center">
                  <Button
                    size="small"
                    variant="text"
                    draggable
                    onDragStart={() => handleDragStart(row.categoryId)}
                    onDragEnd={handleDragEnd}
                    sx={{ minWidth: 0, p: 0.5 }}
                    aria-label="drag category row"
                  >
                    <DragIndicatorIcon fontSize="small" />
                  </Button>
                </Grid>
                <Grid size={{ xs: 5, sm: 5 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Category"
                    value={categoriesById[row.categoryId]?.name || row.categoryId}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid size={{ xs: 3, sm: 3 }}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Enabled"
                    value={row.isEnabled ? "true" : "false"}
                    onChange={(event) =>
                      updateRow(row.categoryId, "isEnabled", event.target.value === "true")
                    }
                  >
                    <MenuItem value="true">Enabled</MenuItem>
                    <MenuItem value="false">Disabled</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 3, sm: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Sequence"
                    inputProps={{ min: 1 }}
                    value={row.sequence}
                    onChange={(event) =>
                      updateRow(row.categoryId, "sequence", Number(event.target.value))
                    }
                  />
                </Grid>
              </Grid>
            ))}
          </Stack>

        </Stack>
      </CardContent>
    </Card>
  );
}

export default UIConfigPage;
