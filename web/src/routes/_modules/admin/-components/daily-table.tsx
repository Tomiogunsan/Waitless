import type { ITableHead } from "@/shared/table/interface";
import Table from "@/shared/table/table";
import type { ChartSeries, DailyPoint } from "@/types/analytics";
import { formatDate } from "@/utils/time";

type DailyRow = DailyPoint & { id: string };

export function DailyTable({ points, series }: { points: DailyPoint[]; series: ChartSeries[] }) {
  const columns: ITableHead<DailyRow>[] = [
    { label: "Date", accessor: "date", render: (row) => formatDate(row.date, "weekday") },
    ...series.map(
      (s): ITableHead<DailyRow> => ({
        label: s.name,
        accessor: null,
        align: "right",
        render: (row) => <span className="tabular">{row.counts[s.id] ?? 0}</span>,
      }),
    ),
    ...(series.length > 1
      ? [
          {
            label: "Total",
            accessor: "total",
            align: "right",
            render: (row) => <span className="tabular font-medium text-slate-900">{row.total}</span>,
          } satisfies ITableHead<DailyRow>,
        ]
      : []),
  ];

  // Newest day first; the table pages through them.
  const data = [...points].reverse().map((row) => ({ ...row, id: row.date }));

  return (
    <Table<DailyRow>
      className="rounded-xl shadow-none"
      tableHeads={columns}
      dataTableSource={data}
      showPagination
      pageSize={10}
    />
  );
}
