import * as catalogApi from "../../../services/api/catalogApi";
import * as itemsApi from "../../../services/api/itemsApi";

export async function getItemCategories() {
  return catalogApi.listItemCategoriesMerged();
}

export async function getCategoryDisplayConfig({ driverId }) {
  const data = await catalogApi.getCategoryDisplayRows(driverId);
  return data.rows || [];
}

export async function getConfiguredItemCategories({ driverId }) {
  return catalogApi.listConfiguredCategories(driverId);
}

export async function saveCategoryDisplayConfig({ driverId, rows }) {
  await catalogApi.saveCategoryDisplay({ driverId, rows });
}

export async function getItemsByCategory() {
  const items = await itemsApi.listItems();
  return items.reduce((acc, item) => {
    if (!item.isActive) {
      return acc;
    }
    if (!acc[item.categoryId]) {
      acc[item.categoryId] = [];
    }
    acc[item.categoryId].push(item);
    return acc;
  }, {});
}
