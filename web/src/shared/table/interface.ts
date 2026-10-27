import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type IAlignType = "left" | "center" | "right";
export type ITableBody = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [x: string]: any;
};

export type ITableMenuOption<TData> = {
  menuTitle: string;
  action: (_rowData: TData) => void;
  hide?: (_rowData: TData) => boolean;
  className?: string;
  icon?: LucideIcon;
  /** "danger" styles destructive actions such as Cancel or Deactivate in red. */
  tone?: "default" | "danger";
  /** Shown but not clickable for this row. */
  disabled?: (_rowData: TData) => boolean;
  /** Short note beside a disabled option explaining why, e.g. "after +15 min". */
  disabledReason?: string;
  /** Draws a divider above this option. */
  separatorBefore?: boolean;
};

export type ITableHead<TData> = {
  label: string;
  accessor: keyof TData | "" | number | null;
  align?: IAlignType;
  // eslint-disable-next-line no-unused-vars
  render?: (data: TData) => ReactNode;
  sticky?: boolean;
  stickyTo?: "left" | "right";
};

export type ITableProp<TData> = {
  className?: string;
  tableHeads?: ITableHead<TData>[];
  showMenu?: boolean;
  dataTableSource: TData[];
  showPagination?: boolean;
  showDivider?: boolean;
  onMenuClick?: (_rowData: TData) => void;
  onRowClick?: (_rowData: TData) => void;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (_page: number, _pageSize: number) => void;
  total?: number;
  loading?: boolean | string;
  menuOptions?: ITableMenuOption<TData>[];
  tableLoader?: ReactNode;
  tableEmptyState?: ReactNode;
  handleMenu?: (_rowData: TData) => void;
  EoL?: {
    show?: boolean;
    // eslint-disable-next-line no-unused-vars
    onVisible: (entry: IntersectionObserverEntry) => void;
    showLoader: boolean;
  };

  /** Shows the search input above the table. */
  showSearch?: boolean;
  searchPlaceholder?: string;
  /** Controlled search value. Leave out to let the table manage it. */
  searchValue?: string;
  /**
   * Called as the user types. When provided, the parent filters the data
   * (e.g. server-side); otherwise the table filters the visible columns itself.
   */
  onSearch?: (_value: string) => void;
  /** Fields the built-in search looks in. Defaults to the column accessors. */
  searchKeys?: (keyof TData)[];
  /** Extra controls on the right of the toolbar, e.g. filters or a count. */
  toolbar?: ReactNode;
  /** Extra classes for a row, e.g. to highlight a new or inactive record. */
  rowClassName?: (_rowData: TData) => string | undefined;
  /** Names the row for screen readers, e.g. "Actions for Amaka Obi". */
  rowLabel?: (_rowData: TData) => string;
};
