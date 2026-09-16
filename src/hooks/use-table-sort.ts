import { useState, useMemo } from "react";

export type SortDirection = "asc" | "desc";

export function useTableSort<T>(
  items: T[],
  initialField?: keyof T | string,
  initialDirection: SortDirection = "asc"
) {
  const [sortField, setSortField] = useState<keyof T | string | null>(
    initialField || null
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    initialDirection
  );

  const handleSort = (field: keyof T | string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedItems = useMemo(() => {
    if (!sortField) return items;

    return [...items].sort((a: any, b: any) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle null or undefined
      if (aVal === null || aVal === undefined) aVal = "";
      if (bVal === null || bVal === undefined) bVal = "";

      // Handle numbers
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      // Handle strings (case-insensitive) & dates
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      if (aStr < bStr) return sortDirection === "asc" ? -1 : 1;
      if (aStr > bStr) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [items, sortField, sortDirection]);

  return {
    sortedItems,
    sortField,
    sortDirection,
    handleSort,
  };
}
