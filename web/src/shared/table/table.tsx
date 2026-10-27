import { Loader2, MoreHorizontal, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/dropdown/dropdown-menu";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import type { IAlignType, ITableBody, ITableHead, ITableProp } from "./interface";
import TableEmptyState from "./table-empty-state";
import TableLoader from "./table-loader";
import TablePagination from "./table-pagination";

const ALIGN: Record<IAlignType, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

function stickyClasses<TData>(head: ITableHead<TData>, isHeader: boolean) {
  if (!head.sticky) return "";
  return cn(
    "sticky z-[1]",
    head.stickyTo === "right" ? "right-0 shadow-[-8px_0_8px_-8px_rgb(15_23_42/0.12)]" : "left-0 shadow-[8px_0_8px_-8px_rgb(15_23_42/0.12)]",
    isHeader ? "bg-slate-50" : "bg-white group-hover:bg-slate-50",
  );
}

function cellValue<TData extends ITableBody>(head: ITableHead<TData>, row: TData) {
  if (head.render) return head.render(row);
  if (head.accessor === null || head.accessor === "") return null;
  const value = row[head.accessor as keyof TData];
  return value === null || value === undefined || value === "" ? <span className="text-slate-300">—</span> : String(value);
}

/** Matches the query against every column that has an accessor. */
function matchesQuery<TData extends ITableBody>(row: TData, heads: ITableHead<TData>[], query: string) {
  return heads.some((head) => {
    if (head.accessor === null || head.accessor === "") return false;
    const value = row[head.accessor as keyof TData];
    return value !== null && value !== undefined && String(value).toLowerCase().includes(query);
  });
}

export default function Table<TData extends ITableBody>({
  className,
  tableHeads = [],
  showMenu = false,
  dataTableSource,
  showPagination = false,
  showDivider = true,
  onMenuClick,
  onRowClick,
  pageSize: pageSizeProp = 10,
  currentPage,
  onPageChange,
  total,
  loading = false,
  menuOptions,
  tableLoader,
  tableEmptyState,
  handleMenu,
  EoL,
  showSearch = false,
  searchPlaceholder = "Search",
  searchValue,
  onSearch,
  toolbar,
}: ITableProp<TData>) {
  const [internalQuery, setInternalQuery] = useState("");
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(pageSizeProp);

  const query = searchValue ?? internalQuery;
  const pageSize = onPageChange ? pageSizeProp : internalPageSize;
  // With `total` and `onPageChange`, the parent fetches one page at a time.
  const serverPaginated = total !== undefined && onPageChange !== undefined;
  const columnCount = tableHeads.length + (showMenu ? 1 : 0);
  const isLoading = Boolean(loading);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || onSearch) return dataTableSource;
    return dataTableSource.filter((row) => matchesQuery(row, tableHeads, q));
  }, [dataTableSource, onSearch, query, tableHeads]);

  const totalRows = serverPaginated ? total : filtered.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const page = Math.min(currentPage ?? internalPage, pageCount);
  const rows =
    showPagination && !serverPaginated ? filtered.slice((page - 1) * pageSize, page * pageSize) : filtered;

  const changePage = (nextPage: number, nextSize: number) => {
    setInternalPage(nextPage);
    setInternalPageSize(nextSize);
    onPageChange?.(nextPage, nextSize);
  };

  const changeSearch = (value: string) => {
    setInternalQuery(value);
    setInternalPage(1);
    onSearch?.(value);
  };

  const handleRowKey = (event: KeyboardEvent<HTMLTableRowElement>, row: TData) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowClick?.(row);
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      {(showSearch || toolbar) && (
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          {showSearch ? (
            <div className="relative sm:w-80">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <Input
                type="search"
                value={query}
                onChange={(e) => changeSearch(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="pl-9"
              />
            </div>
          ) : (
            <span />
          )}
          {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
        </div>
      )}

      <div className="relative overflow-x-auto">
        <table className="w-full text-sm" aria-busy={isLoading || undefined}>
          <thead className="bg-slate-50/80 text-xs text-slate-500">
            <tr>
              {tableHeads.map((head, index) => (
                <th
                  key={`${head.label}-${index}`}
                  scope="col"
                  className={cn("px-4 py-3 font-medium whitespace-nowrap", ALIGN[head.align ?? "left"], stickyClasses(head, true))}
                >
                  {head.label}
                </th>
              ))}
              {showMenu && (
                <th scope="col" className="w-12 px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>

          <tbody className={cn(showDivider && "divide-y divide-slate-100")}>
            {isLoading ? (
              tableLoader ?? <TableLoader columns={columnCount} rows={Math.min(pageSize, 5)} message={typeof loading === "string" ? loading : undefined} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columnCount}>{tableEmptyState ?? <TableEmptyState variant={query.trim() ? "no-results" : "empty"} />}</td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => {
                const visibleOptions = menuOptions?.filter((option) => !option.hide?.(row)) ?? [];
                return (
                  <tr
                    key={(row.id as string | number | undefined) ?? rowIndex}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={onRowClick ? (e) => handleRowKey(e, row) : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    className={cn(
                      "group transition-colors hover:bg-slate-50",
                      onRowClick && "cursor-pointer focus-visible:bg-brand-50/60 focus-visible:outline-none",
                    )}
                  >
                    {tableHeads.map((head, index) => (
                      <td
                        key={`${head.label}-${index}`}
                        className={cn("px-4 py-3 text-slate-700", ALIGN[head.align ?? "left"], stickyClasses(head, false))}
                      >
                        {cellValue(head, row)}
                      </td>
                    ))}

                    {showMenu && (
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {menuOptions?.length ? (
                          visibleOptions.length > 0 && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" aria-label="Row actions" onClick={() => onMenuClick?.(row)}>
                                  <MoreHorizontal />
                                </Button>
                              </DropdownMenuTrigger>
                              {/* Menu items render in a portal; stop their clicks reaching the row. */}
                              <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                                {visibleOptions.map((option) => (
                                  <DropdownMenuItem key={option.menuTitle} className={option.className} onSelect={() => option.action(row)}>
                                    {option.menuTitle}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="Row actions"
                            onClick={() => {
                              onMenuClick?.(row);
                              handleMenu?.(row);
                            }}
                          >
                            <MoreHorizontal />
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {EoL?.show && <EndOfList onVisible={EoL.onVisible} showLoader={EoL.showLoader} />}
      </div>

      {showPagination && !isLoading && totalRows > 0 && (
        <TablePagination page={page} pageSize={pageSize} total={totalRows} onChange={changePage} />
      )}
    </Card>
  );
}

/** Infinite scroll: fires onVisible when the bottom of the table scrolls into view. */
function EndOfList({ onVisible, showLoader }: { onVisible: (entry: IntersectionObserverEntry) => void; showLoader: boolean }) {
  const sentinel = useRef<HTMLDivElement>(null);
  const callback = useRef(onVisible);

  useEffect(() => {
    callback.current = onVisible;
  }, [onVisible]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) callback.current(entry);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sentinel} className="flex justify-center py-4">
      {showLoader && <Loader2 className="size-5 animate-spin text-brand-600" aria-label="Loading more" />}
    </div>
  );
}
