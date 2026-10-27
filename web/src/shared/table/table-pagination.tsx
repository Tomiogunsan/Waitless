import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "@/shared/button/button";
import { cn } from "@/utils/cn";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

interface TablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number, pageSize: number) => void;
}

/** Page numbers with ellipses, e.g. 1 … 4 5 6 … 12. */
function pageItems(page: number, pages: number): (number | "gap")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const items: (number | "gap")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pages - 1, page + 1);
  if (start > 2) items.push("gap");
  for (let p = start; p <= end; p++) items.push(p);
  if (end < pages - 1) items.push("gap");
  items.push(pages);
  return items;
}

export default function TablePagination({ page, pageSize, total, onChange }: TablePaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3">
        <p className="tabular">
          Showing <span className="font-medium text-slate-900">{from}</span>–<span className="font-medium text-slate-900">{to}</span> of{" "}
          <span className="font-medium text-slate-900">{total}</span>
        </p>
        <label className="flex items-center gap-1.5">
          <span className="sr-only sm:not-sr-only">Rows</span>
          <select
            value={pageSize}
            onChange={(e) => onChange(1, Number(e.target.value))}
            className="h-8 rounded-lg border-0 bg-white px-2 text-sm text-slate-700 ring-1 ring-slate-200 ring-inset focus:ring-2 focus:ring-brand-500 focus:outline-none"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" onClick={() => onChange(page - 1, pageSize)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft />
        </Button>
        {pageItems(page, pages).map((item, i) =>
          item === "gap" ? (
            <span key={`gap-${i}`} className="px-1 text-slate-400" aria-hidden>
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onChange(item, pageSize)}
              aria-current={item === page ? "page" : undefined}
              className={cn(
                "tabular size-8 rounded-lg text-sm font-medium transition-colors",
                item === page ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100",
              )}
            >
              {item}
            </button>
          ),
        )}
        <Button size="icon" variant="ghost" onClick={() => onChange(page + 1, pageSize)} disabled={page >= pages} aria-label="Next page">
          <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
