function humanizeCategoryId(categoryId) {
  const slug = String(categoryId).replace(/^cat-/, "").replace(/-/g, " ");
  return slug.replace(/\b\w/g, (ch) => ch.toUpperCase());
}

async function loadMasterCategories(db) {
  const rows = await db.all(`SELECT id, name, sort_order FROM item_categories ORDER BY sort_order ASC, id ASC`);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    sortOrder: r.sort_order
  }));
}

async function loadReferencedCategoryIds(db) {
  const rows = await db.all(
    `SELECT DISTINCT category_id FROM items WHERE is_active = 1 AND trim(category_id) != ''`
  );
  return rows.map((r) => r.category_id);
}

/**
 * Master categories plus category IDs referenced by active items (discovered categories).
 */
async function getMergedItemCategories(db) {
  const fromMaster = await loadMasterCategories(db);
  const knownIds = new Set(fromMaster.map((c) => c.id));
  const referenced = await loadReferencedCategoryIds(db);
  const maxSort = fromMaster.reduce((m, c) => Math.max(m, c.sortOrder), 0);
  let extra = 0;
  const discovered = [];
  for (const id of referenced) {
    if (!knownIds.has(id)) {
      extra += 1;
      discovered.push({
        id,
        name: humanizeCategoryId(id),
        sortOrder: maxSort + extra
      });
    }
  }
  discovered.sort((a, b) => a.id.localeCompare(b.id));
  return [...fromMaster, ...discovered];
}

function normalizeConfigRow(row) {
  return {
    categoryId: row.categoryId,
    isEnabled: Boolean(row.isEnabled),
    sequence: Number(row.sequence) || 1
  };
}

async function getSavedDisplayRows(db, driverUserId) {
  const scope = driverUserId ? "driver" : "default";
  const row = driverUserId
    ? await db.get(`SELECT entries_json FROM category_display_settings WHERE scope = 'driver' AND driver_user_id = ?`, [
        driverUserId
      ])
    : await db.get(`SELECT entries_json FROM category_display_settings WHERE scope = 'default'`);

  if (!row || !row.entries_json) {
    return [];
  }
  try {
    const parsed = JSON.parse(row.entries_json);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeConfigRow).sort((a, b) => a.sequence - b.sequence || a.categoryId.localeCompare(b.categoryId));
  } catch {
    return [];
  }
}

/**
 * Merges saved display rules with merged category catalog.
 */
async function getCategoryDisplayConfig(db, driverUserId) {
  const allCategories = await getMergedItemCategories(db);
  const baseRows = await getSavedDisplayRows(db, driverUserId);
  const normalizedBase =
    baseRows.length > 0
      ? [...baseRows].map(normalizeConfigRow).sort((a, b) => a.sequence - b.sequence)
      : allCategories.map((c, index) => ({
          categoryId: c.id,
          isEnabled: true,
          sequence: index + 1
        }));

  const byId = new Map(normalizedBase.map((r) => [r.categoryId, r]));
  let maxSeq = normalizedBase.reduce((m, r) => Math.max(m, r.sequence), 0);

  const merged = [];
  for (const cat of allCategories) {
    let row = byId.get(cat.id);
    if (!row) {
      maxSeq += 1;
      row = { categoryId: cat.id, isEnabled: true, sequence: maxSeq };
    }
    merged.push(row);
  }
  return merged.sort((a, b) => a.sequence - b.sequence || a.categoryId.localeCompare(b.categoryId));
}

async function getConfiguredItemCategories(db, driverUserId) {
  const allCategories = await getMergedItemCategories(db);
  const byId = Object.fromEntries(allCategories.map((c) => [c.id, c]));
  const configRows = await getCategoryDisplayConfig(db, driverUserId);

  return configRows
    .filter((row) => row.isEnabled)
    .sort((a, b) => a.sequence - b.sequence)
    .map((row) => byId[row.categoryId])
    .filter(Boolean);
}

module.exports = {
  getMergedItemCategories,
  getCategoryDisplayConfig,
  getConfiguredItemCategories,
  humanizeCategoryId
};
