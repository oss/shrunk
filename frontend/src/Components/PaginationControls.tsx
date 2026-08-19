import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import { Button } from '@/Components/ui/button';

interface Props {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  label: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export default function PaginationControls({
  currentPage,
  totalPages,
  pageSize,
  label,
  onPageChange,
  onPageSizeChange,
}: Props) {
  return (
    <div className="flex items-center justify-center gap-3 pt-4 text-sm text-muted-foreground">
      <Button
        variant="ghost"
        size="icon"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label={`Previous ${label} page`}
      >
        <ChevronLeftIcon />
      </Button>
      <span className="flex h-8 min-w-8 items-center justify-center rounded-md border px-3 font-semibold">
        {currentPage}
      </span>
      <Button
        variant="ghost"
        size="icon"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label={`Next ${label} page`}
      >
        <ChevronRightIcon />
      </Button>
      <label className="ml-3 flex items-center gap-2">
        <select
          aria-label={`${label} per page`}
          className="h-8 rounded-md border border-input bg-background px-3 font-semibold text-foreground"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {[5, 10, 20, 50].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span>/ page</span>
      </label>
    </div>
  );
}
