import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid2 as Grid,
  ListSubheader,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Typography
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import MenuIcon from "@mui/icons-material/Menu";
import { submitPurchaseOrder } from "./services/api/purchaseOrderApi";
import hawkeyeLogo from "./assets/hawkeye-logo.png";
import {
  getActiveDriversForFieldApp,
  verifyDriverFieldLogin
} from "./features/user/services/userDirectoryService";
import { getScheduledCustomersForDriverOnDate } from "./features/scheduling/services/driverCustomerScheduleService";
import {
  getSiteLocationsForSite,
  getSitesForCustomer
} from "./features/site/services/siteDirectoryService";
import {
  getConfiguredItemCategories,
  getItemsByCategory
} from "./features/item/services/itemCatalogService";
import UIConfigPage from "./pages/UIConfigPage";
import UsersAdminPage from "./pages/UsersAdminPage";
import CustomersAdminPage from "./pages/CustomersAdminPage";
import ItemsAdminPage from "./pages/ItemsAdminPage";
import DriverPerformancePage from "./pages/DriverPerformancePage";
import PurchaseOrdersPage from "./pages/PurchaseOrdersPage";
import ScheduleAdminPage from "./pages/ScheduleAdminPage";
import HomePage from "./pages/HomePage";

const PAGE_HASH = {
  home: "/",
  "driver-app": "/driver",
  "ui-config": "/ui-configuration",
  users: "/user-configuration",
  customers: "/customer-configuration",
  items: "/items-configuration",
  "analytics-driver-performance": "/analytics/driver-performance",
  "orders-purchase-list": "/orders/purchase-list",
  schedule: "/schedule-configuration"
};

const getPageFromHash = () => {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const path = raw.split("?")[0] || "/";
  if (path === "/") return "home";
  if (path === "/driver") return "driver-app";
  if (path === "/ui-configuration" || path === "/ui-config") return "ui-config";
  if (path === "/user-configuration" || path === "/user-config" || path === "/users") return "users";
  if (path === "/customer-configuration" || path === "/customer-config") return "customers";
  if (path === "/items-configuration" || path === "/items-config") return "items";
  if (path === "/analytics/driver-performance") return "analytics-driver-performance";
  if (path === "/orders/purchase-list") return "orders-purchase-list";
  if (path === "/schedule-configuration") return "schedule";
  return "home";
};

const emptyCategoryLine = () => ({
  sku: "",
  itemDescription: "",
  quantity: ""
});

const buildInitialCategoryOrders = (categories) =>
  categories.reduce((acc, category) => {
    acc[category.id] = [emptyCategoryLine()];
    return acc;
  }, {});

const reconcileCategoryOrders = (previousOrders, categories) =>
  categories.reduce((acc, category) => {
    acc[category.id] = previousOrders[category.id] || [emptyCategoryLine()];
    return acc;
  }, {});

function App() {
  const [currentPage, setCurrentPage] = useState(getPageFromHash);
  const [uiConfigurationVersion, setUiConfigurationVersion] = useState(0);
  const [itemsCatalogVersion, setItemsCatalogVersion] = useState(0);
  const [usersDirectoryVersion, setUsersDirectoryVersion] = useState(0);
  const [form, setForm] = useState({
    customerId: "",
    customerName: "",
    siteId: "",
    siteName: "",
    locationId: "",
    locationName: "",
    serviceDate: new Date().toISOString().split("T")[0],
    driverName: "",
    notes: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [activeDrivers, setActiveDrivers] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [enteredDriverIdNumber, setEnteredDriverIdNumber] = useState("");
  const [verifiedDriver, setVerifiedDriver] = useState(null);
  const [driverAuthError, setDriverAuthError] = useState("");
  const [scheduledCustomers, setScheduledCustomers] = useState([]);
  const [sites, setSites] = useState([]);
  const [siteLocations, setSiteLocations] = useState([]);
  const [itemCategories, setItemCategories] = useState([]);
  const [itemsByCategory, setItemsByCategory] = useState({});
  const [categoryOrders, setCategoryOrders] = useState({});
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState("");
  const [driverOrderStep, setDriverOrderStep] = useState("edit");

  const orderedItems = useMemo(
    () =>
      Object.entries(categoryOrders).flatMap(([categoryId, lines]) =>
        (lines || [])
          .filter((line) => line.sku && Number(line.quantity) > 0)
          .map((line) => ({
            categoryId,
            sku: line.sku,
            itemDescription: line.itemDescription,
            quantity: Number(line.quantity)
          }))
      ),
    [categoryOrders]
  );

  const canSubmit = useMemo(
    () =>
      Boolean(
        form.customerId &&
          form.siteId &&
          form.locationId &&
          form.serviceDate &&
          form.driverName &&
          orderedItems.length > 0
      ),
    [form, orderedItems.length]
  );

  const selectedSite = useMemo(
    () => sites.find((site) => site.id === form.siteId) || null,
    [sites, form.siteId]
  );

  const categoryNameById = useMemo(
    () =>
      itemCategories.reduce((acc, category) => {
        acc[category.id] = category.name;
        return acc;
      }, {}),
    [itemCategories]
  );

  const updateFormField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    let isMounted = true;
    const loadFieldDrivers = async () => {
      try {
        const drivers = await getActiveDriversForFieldApp();
        if (isMounted) {
          setActiveDrivers(drivers);
        }
      } catch (error) {
        if (isMounted) {
          setDriverAuthError("Could not load driver list from User Configuration. Please refresh.");
        }
      }
    };
    loadFieldDrivers();
    return () => {
      isMounted = false;
    };
  }, [usersDirectoryVersion]);

  useEffect(() => {
    let isMounted = true;
    const loadCatalog = async () => {
      try {
        const catalogMap = await getItemsByCategory();
        if (isMounted) {
          setItemsByCategory(catalogMap);
        }
      } catch (error) {
        if (isMounted) {
          setDriverAuthError("Could not load item catalog. Please refresh.");
        }
      }
    };
    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, [itemsCatalogVersion]);

  useEffect(() => {
    if (!verifiedDriver) {
      setScheduledCustomers([]);
      setScheduleError("");
      return;
    }

    let isMounted = true;
    const loadScheduledCustomers = async () => {
      setIsLoadingSchedule(true);
      setScheduleError("");
      try {
        const customers = await getScheduledCustomersForDriverOnDate({
          driverId: verifiedDriver.id,
          serviceDate: form.serviceDate
        });
        if (isMounted) {
          setScheduledCustomers(customers);
        }
      } catch (error) {
        if (isMounted) {
          setScheduleError("Could not load route schedule for this day.");
          setScheduledCustomers([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingSchedule(false);
        }
      }
    };
    loadScheduledCustomers();
    return () => {
      isMounted = false;
    };
  }, [verifiedDriver, form.serviceDate]);

  useEffect(() => {
    const customerStillScheduled = scheduledCustomers.some(
      (customer) => customer.id === form.customerId
    );
    if (form.customerId && !customerStillScheduled) {
      setForm((prev) => ({
        ...prev,
        customerId: "",
        customerName: "",
        siteId: "",
        siteName: "",
        locationId: "",
        locationName: ""
      }));
      setSites([]);
      setSiteLocations([]);
    }
  }, [scheduledCustomers, form.customerId]);

  useEffect(() => {
    let isMounted = true;
    const loadSites = async () => {
      const availableSites = await getSitesForCustomer(form.customerId);
      if (isMounted) {
        setSites(availableSites);
      }
    };
    if (form.customerId) {
      loadSites();
    } else {
      setSites([]);
    }
    return () => {
      isMounted = false;
    };
  }, [form.customerId]);

  useEffect(() => {
    let isMounted = true;
    const loadLocations = async () => {
      const rows = await getSiteLocationsForSite(form.siteId);
      if (isMounted) {
        setSiteLocations(rows);
      }
    };
    if (form.siteId) {
      loadLocations();
    } else {
      setSiteLocations([]);
    }
    return () => {
      isMounted = false;
    };
  }, [form.siteId]);

  useEffect(() => {
    let isMounted = true;
    const loadConfiguredCategories = async () => {
      const categories = await getConfiguredItemCategories({
        driverId: verifiedDriver ? verifiedDriver.id : undefined
      });
      if (!isMounted) {
        return;
      }
      setItemCategories(categories);
      setCategoryOrders((prev) => reconcileCategoryOrders(prev, categories));
    };
    loadConfiguredCategories();
    return () => {
      isMounted = false;
    };
  }, [verifiedDriver, uiConfigurationVersion, itemsCatalogVersion]);

  const handleOpenMenu = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
  };

  useEffect(() => {
    const syncPageWithHash = () => {
      setCurrentPage(getPageFromHash());
    };

    window.addEventListener("hashchange", syncPageWithHash);
    syncPageWithHash();

    return () => {
      window.removeEventListener("hashchange", syncPageWithHash);
    };
  }, []);

  useEffect(() => {
    if (currentPage !== "driver-app" && feedback.message) {
      setFeedback({ type: "", message: "" });
    }
  }, [currentPage, feedback.message]);

  useEffect(() => {
    // Hash navigation does not remount pages; refresh driver session on leave
    // so changes made elsewhere (schedule, customers, items, config) are reflected on return.
    if (currentPage !== "driver-app") {
      resetDriverSession();
    }
  }, [currentPage]);

  const navigateToPage = (nextPage) => {
    window.location.hash = PAGE_HASH[nextPage] ?? "/";
  };

  const handleGoToDriverApp = () => {
    navigateToPage("driver-app");
    handleCloseMenu();
  };

  const handleGoToHome = () => {
    navigateToPage("home");
    handleCloseMenu();
  };

  const handleGoToUiConfig = () => {
    navigateToPage("ui-config");
    handleCloseMenu();
  };

  const handleGoToUsers = () => {
    navigateToPage("users");
    handleCloseMenu();
  };

  const handleGoToCustomerConfig = () => {
    navigateToPage("customers");
    handleCloseMenu();
  };

  const handleGoToItemsConfig = () => {
    navigateToPage("items");
    handleCloseMenu();
  };

  const handleGoToDriverPerformance = () => {
    navigateToPage("analytics-driver-performance");
    handleCloseMenu();
  };

  const handleGoToPurchaseOrders = () => {
    navigateToPage("orders-purchase-list");
    handleCloseMenu();
  };

  const handleGoToSchedule = () => {
    navigateToPage("schedule");
    handleCloseMenu();
  };

  const handleItemsCatalogChanged = () => {
    setItemsCatalogVersion((v) => v + 1);
  };

  const handleVerifyDriver = async () => {
    const result = await verifyDriverFieldLogin({
      userId: selectedDriverId,
      userIdNumber: enteredDriverIdNumber
    });
    if (!result.ok) {
      setDriverAuthError(result.reason);
      return;
    }
    setVerifiedDriver(result.driver);
    setDriverAuthError("");
    updateFormField("driverName", result.driver.name);
  };

  const handleCustomerChange = (customerId) => {
    const selectedCustomer = scheduledCustomers.find((customer) => customer.id === customerId);
    setForm((prev) => ({
      ...prev,
      customerId,
      customerName: selectedCustomer ? selectedCustomer.name : "",
      siteId: "",
      siteName: "",
      locationId: "",
      locationName: ""
    }));
  };

  const handleSiteChange = (siteId) => {
    const site = sites.find((s) => s.id === siteId);
    setForm((prev) => ({
      ...prev,
      siteId,
      siteName: site ? site.name : "",
      locationId: "",
      locationName: ""
    }));
  };

  const handleLocationChange = (locationId) => {
    const selectedSiteLocation = siteLocations.find((loc) => loc.id === locationId);
    setForm((prev) => ({
      ...prev,
      locationId,
      locationName: selectedSiteLocation ? selectedSiteLocation.name : ""
    }));
  };

  const updateCategoryLine = (categoryId, index, field, value) => {
    setCategoryOrders((prev) => {
      const updated = [...(prev[categoryId] || [])];
      const current = { ...updated[index], [field]: value };
      if (field === "sku") {
        const chosenItem = (itemsByCategory[categoryId] || []).find((item) => item.sku === value);
        current.itemDescription = chosenItem ? chosenItem.name : "";
      }
      updated[index] = current;
      return { ...prev, [categoryId]: updated };
    });
  };

  const addCategoryLine = (categoryId) => {
    setCategoryOrders((prev) => ({
      ...prev,
      [categoryId]: [...(prev[categoryId] || []), emptyCategoryLine()]
    }));
  };

  const removeCategoryLine = (categoryId, index) => {
    setCategoryOrders((prev) => {
      const lines = prev[categoryId] || [];
      if (lines.length === 1) {
        return prev;
      }
      return {
        ...prev,
        [categoryId]: lines.filter((_, lineIndex) => lineIndex !== index)
      };
    });
  };

  const resetForm = () => {
    setForm((prev) => ({
      customerId: "",
      customerName: "",
      siteId: "",
      siteName: "",
      locationId: "",
      locationName: "",
      serviceDate: new Date().toISOString().split("T")[0],
      driverName: prev.driverName,
      notes: ""
    }));
    setCategoryOrders(buildInitialCategoryOrders(itemCategories));
    setDriverOrderStep("edit");
  };

  const resetDriverSession = () => {
    setVerifiedDriver(null);
    setSelectedDriverId("");
    setEnteredDriverIdNumber("");
    setDriverAuthError("");
    setScheduledCustomers([]);
    setScheduleError("");
    setSites([]);
    setSiteLocations([]);
    setFeedback({ type: "", message: "" });
    setDriverOrderStep("edit");
    setForm({
      customerId: "",
      customerName: "",
      siteId: "",
      siteName: "",
      locationId: "",
      locationName: "",
      serviceDate: new Date().toISOString().split("T")[0],
      driverName: "",
      notes: ""
    });
  };

  const handleSubmit = async () => {
    setFeedback({ type: "", message: "" });
    setIsSubmitting(true);
    try {
      const siteLine = [form.siteName, form.locationName].filter(Boolean).join(" — ");
      const response = await submitPurchaseOrder({
        ...form,
        siteName: siteLine,
        items: orderedItems
      });
      const poLabel = response.poNumber || `Order #${response.id}`;
      setFeedback({
        type: "success",
        message: `${poLabel} submitted for ${form.customerName}.`
      });
      resetForm();
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToReview = () => {
    if (!canSubmit) {
      setFeedback({
        type: "error",
        message: "Complete customer, site, location, date, and at least one SKU with quantity before review."
      });
      return;
    }
    setFeedback({ type: "", message: "" });
    setDriverOrderStep("review");
  };

  return (
    <Box>
      <Dialog
        open={!verifiedDriver && currentPage === "driver-app"}
        disableEscapeKeyDown
        onClose={() => {}}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Driver sign-in</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              select
              size="small"
              label="Select driver"
              value={selectedDriverId}
              onChange={(event) => {
                setSelectedDriverId(event.target.value);
                setDriverAuthError("");
              }}
              fullWidth
              helperText="List comes from User Configuration (active users with Driver role)."
            >
              {activeDrivers.map((driver) => (
                <MenuItem key={driver.id} value={driver.id}>
                  {driver.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="User ID #"
              value={enteredDriverIdNumber}
              onChange={(event) => {
                setEnteredDriverIdNumber(event.target.value);
                setDriverAuthError("");
              }}
              fullWidth
            />
            {driverAuthError && <Alert severity="error">{driverAuthError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" size="small" onClick={handleVerifyDriver}>
            Verify Driver
          </Button>
        </DialogActions>
      </Dialog>

      <AppBar position="sticky">
        <Toolbar variant="dense">
          <IconButton color="inherit" aria-label="app menu" onClick={handleOpenMenu}>
            <MenuIcon />
          </IconButton>
          <Menu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={handleCloseMenu}>
            <MenuItem onClick={handleGoToHome}>Home</MenuItem>
            <Divider />
            <ListSubheader component="div" disableSticky sx={{ fontWeight: 700, lineHeight: 2.25 }}>
              Orders
            </ListSubheader>
            <MenuItem sx={{ pl: 3 }} onClick={handleGoToDriverApp}>
              Customer Replen Order
            </MenuItem>
            <MenuItem sx={{ pl: 3 }} onClick={handleGoToPurchaseOrders}>
              Purchase Order List
            </MenuItem>
            <Divider />
            <ListSubheader component="div" disableSticky sx={{ fontWeight: 700, lineHeight: 2.25 }}>
              Analytics
            </ListSubheader>
            <MenuItem sx={{ pl: 3 }} onClick={handleGoToDriverPerformance}>
              Driver performance
            </MenuItem>
            <Divider />
            <ListSubheader component="div" disableSticky sx={{ fontWeight: 700, lineHeight: 2.25 }}>
              Driver Apps Configuration
            </ListSubheader>
            <MenuItem sx={{ pl: 3 }} onClick={handleGoToUiConfig}>
              Product Category Display Configuration
            </MenuItem>
            <MenuItem sx={{ pl: 3 }} onClick={handleGoToUsers}>
              User Configuration
            </MenuItem>
            <MenuItem sx={{ pl: 3 }} onClick={handleGoToCustomerConfig}>
              Customer Configuration
            </MenuItem>
            <MenuItem sx={{ pl: 3 }} onClick={handleGoToItemsConfig}>
              Items Configuration
            </MenuItem>
            <MenuItem sx={{ pl: 3 }} onClick={handleGoToSchedule}>
              Driver route schedule
            </MenuItem>
          </Menu>
          <Box sx={{ width: 8 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Driver Apps
          </Typography>
          <Box
            component="img"
            src={hawkeyeLogo}
            alt="Hawkeye Fire & Safety logo"
            sx={{ height: 30, width: "auto", ml: 2 }}
          />
        </Toolbar>
      </AppBar>

      <Container
        maxWidth={
          currentPage === "analytics-driver-performance"
            ? "lg"
            : currentPage === "orders-purchase-list"
              ? "xl"
              : "md"
        }
        sx={{ py: 2 }}
      >
        <Stack spacing={1.5}>
          {/* Route-specific pages own their title + intro inside their component. Only the driver field app uses this shell header (single surface). */}
          {currentPage === "driver-app" ? (
            <>
              <Typography variant="h5" fontWeight={700}>
                Customer Replen Order
              </Typography>
            </>
          ) : null}

          {feedback.message && currentPage === "driver-app" && (
            <Alert severity={feedback.type === "error" ? "error" : "success"}>{feedback.message}</Alert>
          )}

          {currentPage === "driver-app" ? (
            <Card>
              <CardContent sx={{ p: 1.5 }}>
                <Box>
                  <Stack spacing={1.5}>
                    {driverOrderStep === "edit" ? (
                      <>
                        <Grid container spacing={1}>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              select
                              size="small"
                              required
                              fullWidth
                              label="Customer"
                              value={form.customerId}
                              onChange={(e) => handleCustomerChange(e.target.value)}
                              disabled={!scheduledCustomers.length || isLoadingSchedule}
                              helperText={
                                scheduleError
                                  ? scheduleError
                                  : isLoadingSchedule
                                    ? "Loading customers..."
                                    : scheduledCustomers.length
                                      ? ""
                                      : "No customers available for this day."
                              }
                            >
                              {scheduledCustomers.map((customer) => (
                                <MenuItem key={customer.id} value={customer.id}>
                                  {customer.name}
                                </MenuItem>
                              ))}
                            </TextField>
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              select
                              size="small"
                              required
                              fullWidth
                              label="Site"
                              value={form.siteId}
                              onChange={(e) => handleSiteChange(e.target.value)}
                              disabled={!form.customerId || !sites.length}
                              helperText={
                                form.customerId && !sites.length ? "No active sites for this customer." : ""
                              }
                            >
                              {sites.map((site) => (
                                <MenuItem key={site.id} value={site.id}>
                                  {site.name}
                                </MenuItem>
                              ))}
                            </TextField>
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              select
                              size="small"
                              required
                              fullWidth
                              label="Location"
                              value={form.locationId}
                              onChange={(e) => handleLocationChange(e.target.value)}
                              disabled={!form.siteId || !siteLocations.length}
                              helperText={
                                form.siteId && !siteLocations.length
                                  ? "No active locations under this site."
                                  : ""
                              }
                            >
                              {siteLocations.map((loc) => (
                                <MenuItem key={loc.id} value={loc.id}>
                                  {loc.name}
                                </MenuItem>
                              ))}
                            </TextField>
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              size="small"
                              required
                              fullWidth
                              type="date"
                              label="Service Date"
                              value={form.serviceDate}
                              onChange={(e) => updateFormField("serviceDate", e.target.value)}
                              slotProps={{ inputLabel: { shrink: true } }}
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                              size="small"
                              required
                              fullWidth
                              label="Verified Driver"
                              value={form.driverName}
                              InputProps={{ readOnly: true }}
                            />
                          </Grid>
                        </Grid>

                        {selectedSite?.entryNotes?.trim() ? (
                          <Alert severity="info" variant="outlined">
                            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                              Entry notes
                            </Typography>
                            <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                              {selectedSite.entryNotes}
                            </Typography>
                          </Alert>
                        ) : null}

                        <Stack spacing={1}>
                          {itemCategories.map((category) => (
                            <Card key={category.id} variant="outlined">
                              <CardContent sx={{ p: 1 }}>
                                <Stack spacing={1}>
                                  <Typography variant="subtitle2" fontWeight={700}>
                                    {category.name}
                                  </Typography>
                                  {(categoryOrders[category.id] || []).map((line, index) => (
                                    <Grid container spacing={1} key={`${category.id}-${index}`}>
                                      <Grid size={{ xs: 8, sm: 9 }}>
                                        <TextField
                                          select
                                          size="small"
                                          fullWidth
                                          label="SKU"
                                          value={line.sku}
                                          onChange={(e) =>
                                            updateCategoryLine(category.id, index, "sku", e.target.value)
                                          }
                                        >
                                          {(itemsByCategory[category.id] || []).map((item) => (
                                            <MenuItem key={item.id} value={item.sku}>
                                              {item.sku} - {item.name}
                                            </MenuItem>
                                          ))}
                                        </TextField>
                                      </Grid>
                                      <Grid size={{ xs: 3, sm: 2 }}>
                                        <TextField
                                          size="small"
                                          fullWidth
                                          type="number"
                                          label="Qty"
                                          inputProps={{ min: 0 }}
                                          value={line.quantity}
                                          onChange={(e) =>
                                            updateCategoryLine(category.id, index, "quantity", e.target.value)
                                          }
                                        />
                                      </Grid>
                                      <Grid size={{ xs: 1, sm: 1 }} display="flex" alignItems="center">
                                        <IconButton
                                          size="small"
                                          aria-label="remove line"
                                          onClick={() => removeCategoryLine(category.id, index)}
                                          disabled={(categoryOrders[category.id] || []).length === 1}
                                        >
                                          <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                      </Grid>
                                    </Grid>
                                  ))}
                                  <Button
                                    size="small"
                                    variant="text"
                                    startIcon={<AddCircleOutlineIcon fontSize="small" />}
                                    onClick={() => addCategoryLine(category.id)}
                                  >
                                    Add SKU
                                  </Button>
                                </Stack>
                              </CardContent>
                            </Card>
                          ))}
                        </Stack>

                        <TextField
                          size="small"
                          label="Service Notes"
                          fullWidth
                          multiline
                          minRows={2}
                          value={form.notes}
                          onChange={(e) => updateFormField("notes", e.target.value)}
                        />

                        <Stack direction="row" spacing={1.5}>
                          <Button variant="contained" size="small" onClick={handleGoToReview} disabled={!canSubmit}>
                            Review Order
                          </Button>
                          <Button variant="text" size="small" onClick={resetForm} disabled={isSubmitting}>
                            Clear
                          </Button>
                        </Stack>
                      </>
                    ) : (
                      <>
                        <Typography variant="h6" fontWeight={700}>
                          Review Order
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Confirm all lines before submitting.
                        </Typography>
                        <Card variant="outlined">
                          <CardContent sx={{ p: 1.5 }}>
                            <Stack spacing={0.5}>
                              <Typography variant="body2">
                                <strong>Customer:</strong> {form.customerName}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Site:</strong> {form.siteName}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Location:</strong> {form.locationName}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Service Date:</strong> {form.serviceDate}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Driver:</strong> {form.driverName}
                              </Typography>
                            </Stack>
                          </CardContent>
                        </Card>
                        <Card variant="outlined">
                          <CardContent sx={{ p: 0 }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>SKU</TableCell>
                                  <TableCell>Description</TableCell>
                                  <TableCell>Category</TableCell>
                                  <TableCell align="right">Qty</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {orderedItems.map((line, index) => (
                                  <TableRow key={`${line.categoryId}-${line.sku}-${index}`}>
                                    <TableCell>{line.sku}</TableCell>
                                    <TableCell>{line.itemDescription || "—"}</TableCell>
                                    <TableCell>{categoryNameById[line.categoryId] || line.categoryId}</TableCell>
                                    <TableCell align="right">{line.quantity}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                        <Stack direction="row" spacing={1.5}>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={handleSubmit}
                            disabled={!canSubmit || isSubmitting}
                          >
                            {isSubmitting ? "Submitting..." : "Submit Order"}
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => setDriverOrderStep("edit")}
                            disabled={isSubmitting}
                          >
                            Back to Edit
                          </Button>
                          <Button variant="text" size="small" onClick={resetForm} disabled={isSubmitting}>
                            Clear
                          </Button>
                        </Stack>
                      </>
                    )}
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          ) : currentPage === "home" ? (
            <HomePage
              onGoToDriverApp={() => navigateToPage("driver-app")}
              onGoToCustomers={() => navigateToPage("customers")}
              onGoToItems={() => navigateToPage("items")}
              onGoToPurchaseOrders={() => navigateToPage("orders-purchase-list")}
            />
          ) : currentPage === "analytics-driver-performance" ? (
            <DriverPerformancePage />
          ) : currentPage === "orders-purchase-list" ? (
            <PurchaseOrdersPage />
          ) : currentPage === "ui-config" ? (
            <UIConfigPage
              activeDrivers={activeDrivers}
              onConfigurationSaved={() => setUiConfigurationVersion((prev) => prev + 1)}
            />
          ) : currentPage === "customers" ? (
            <CustomersAdminPage />
          ) : currentPage === "items" ? (
            <ItemsAdminPage onCatalogChanged={handleItemsCatalogChanged} />
          ) : currentPage === "schedule" ? (
            <ScheduleAdminPage />
          ) : (
            <UsersAdminPage onUsersChanged={() => setUsersDirectoryVersion((v) => v + 1)} />
          )}
        </Stack>
      </Container>
    </Box>
  );
}

export default App;
