const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const cors = require("cors");
const express = require("express");
const { initDb } = require("./db");
const purchaseOrderRoutes = require("./routes/purchaseOrderRoutes");
const masterDataRoutes = require("./routes/masterDataRoutes");
const usersRoutes = require("./routes/usersRoutes");
const itemsRoutes = require("./routes/itemsRoutes");
const catalogRoutes = require("./routes/catalogRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");

const app = express();
const port = process.env.PORT || 3001;
const allowedOrigin = process.env.WEB_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: "2mb" }));

app.use("/api", purchaseOrderRoutes);
app.use("/api", masterDataRoutes);
app.use("/api", usersRoutes);
app.use("/api", itemsRoutes);
app.use("/api", catalogRoutes);
app.use("/api", scheduleRoutes);

async function start() {
  await initDb();
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start API", error);
  process.exit(1);
});
