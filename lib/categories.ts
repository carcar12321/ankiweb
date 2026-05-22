export const uncategorizedCategoryKey = "__UNCATEGORIZED__";
export const uncategorizedCategoryLabel = "미분류";

export type CategoryValue = string | null;

export function getCategoryKey(category: CategoryValue) {
  return category && category.length > 0
    ? category
    : uncategorizedCategoryKey;
}

export function getCategoryLabel(category: CategoryValue) {
  return category && category.length > 0 ? category : uncategorizedCategoryLabel;
}

export function categoryFromKey(key: string): CategoryValue {
  return key === uncategorizedCategoryKey ? null : key;
}

export function normalizeCategoryFilters(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const filters = value
    .map((item) => {
      if (item === null) {
        return null;
      }

      return typeof item === "string" ? item.trim() : undefined;
    })
    .filter((item): item is CategoryValue => item !== undefined);

  return Array.from(new Set(filters));
}
