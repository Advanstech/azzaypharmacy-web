import { useState, useMemo, useEffect, useCallback } from 'react';

export interface UsePaginationProps<T> {
  data: T[];
  itemsPerPage?: number;
  initialPage?: number;
}

export function usePagination<T>({ data, itemsPerPage = 10, initialPage = 1 }: UsePaginationProps<T>) {
  const [currentPage, setCurrentPage] = useState(initialPage);

  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Ensure current page is valid when data changes (e.g. after a filter)
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    } else if (currentPage < 1 && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalItems, totalPages, currentPage]);

  const validCurrentPage = Math.max(1, Math.min(currentPage, totalPages));

  const paginatedData = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  }, [data, validCurrentPage, itemsPerPage]);

  const nextPage = useCallback(() => setCurrentPage((p) => Math.min(p + 1, totalPages)), [totalPages]);
  const prevPage = useCallback(() => setCurrentPage((p) => Math.max(p - 1, 1)), []);
  const goToPage = useCallback((page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages))), [totalPages]);

  const startIndex = totalItems === 0 ? 0 : (validCurrentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(validCurrentPage * itemsPerPage, totalItems);

  return {
    currentPage: validCurrentPage,
    totalPages,
    paginatedData,
    nextPage,
    prevPage,
    goToPage,
    startIndex,
    endIndex,
    totalItems,
    itemsPerPage,
  };
}
