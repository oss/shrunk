import { useCallback, useEffect, useMemo, useState } from 'react';

export function useLinkSelection<T extends { _id: string }>(visibleItems: T[]) {
  const [selectedItems, setSelectedItems] = useState<T[]>([]);
  const visibleIds = useMemo(
    () => new Set(visibleItems.map((item) => item._id)),
    [visibleItems],
  );

  useEffect(() => {
    const refreshed = new Map(visibleItems.map((item) => [item._id, item]));
    setSelectedItems((selected) =>
      selected.flatMap((item) => {
        const replacement = refreshed.get(item._id);
        return replacement ? [replacement] : [];
      }),
    );
  }, [visibleItems]);

  const visibleSelectedCount = selectedItems.filter((item) =>
    visibleIds.has(item._id),
  ).length;
  const allVisibleSelected =
    visibleItems.length > 0 && visibleSelectedCount === visibleItems.length;

  const setItemSelected = useCallback(
    (item: T, checked: boolean) =>
      setSelectedItems((selected) =>
        checked
          ? selected.some(({ _id }) => _id === item._id)
            ? selected
            : [...selected, item]
          : selected.filter(({ _id }) => _id !== item._id),
      ),
    [],
  );

  const toggleVisibleSelection = useCallback(
    (checked: boolean) =>
      setSelectedItems((selected) => {
        if (!checked)
          return selected.filter((item) => !visibleIds.has(item._id));
        const selectedIds = new Set(selected.map((item) => item._id));
        return [
          ...selected,
          ...visibleItems.filter((item) => !selectedIds.has(item._id)),
        ];
      }),
    [visibleIds, visibleItems],
  );

  const clearSelection = useCallback(() => setSelectedItems([]), []);

  return {
    selectedItems,
    selectedIds: selectedItems.map((item) => item._id),
    visibleSelectedCount,
    allVisibleSelected,
    someVisibleSelected: visibleSelectedCount > 0 && !allVisibleSelected,
    setItemSelected,
    toggleVisibleSelection,
    clearSelection,
  };
}
