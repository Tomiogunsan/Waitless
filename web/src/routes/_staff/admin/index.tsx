import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck2, CheckCircle2, Download, Timer, UserX } from "lucide-react";
import { useMemo, useState } from "react";
import { AppointmentsChart, Legend, WaitTimeChart } from "@/components/admin/charts";
import Button from "@/shared/button/button";
import { Card, CardBody, CardHeader } from "@/shared/card/card";
import Select from "@/shared/select/select";
import PageHeader from "@/shared/page-header/page-header";
import Segmented from "@/shared/segmented/segmented";
import StatTile from "@/shared/stat-tile/stat-tile";
import { DEPARTMENT_COLORS } from "@/lib/chart-colors";
import { DEMO_TODAY } from "@/lib/demo-clock";
import { requireRole } from "@/lib/guards";
import { formatDate } from "@/lib/time";
import { RANGE_OPTIONS, statsForRange, summarize, type DailyStats, type RangeDays } from "@/mocks/analytics";
import { departments } from "@/mocks/clinic";
import type { ITableHead } from "@/shared/table/interface";
import Table from "@/shared/table/table";

// Range and department are search params, so a filtered view can be bookmarked or shared.
interface AnalyticsSearch {
  range: RangeDays;
  department: string;
}

export const Route = createFileRoute("/_staff/admin/")({
  beforeLoad: ({ context }) => requireRole(context.session, ["admin"]),
  validateSearch: (search: Record<string, unknown>): AnalyticsSearch => ({
    range: [7, 30, 90].includes(Number(search.range)) ? (Number(search.range) as RangeDays) : 30,
    department: departments.some((d) => d.id === search.department) ? String(search.department) : "all",
  }),
  component: AnalyticsPage,
});

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function AnalyticsPage() {
  const { range, department } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [view, setView] = useState<"chart" | "table">("chart");

  const { current, previous } = useMemo(() => statsForRange(range), [range]);
  const now = summarize(current, department);
  const before = summarize(previous, department);
  const series = departments.filter((d) => department === "all" || d.id === department);

  const breakdown = useMemo(() => {
    const total = current.reduce((sum, d) => sum + d.total, 0);
    return departments.map((d) => {
      const count = current.reduce((sum, row) => sum + row.byDepartment[d.id]!, 0);
      const byWeekday = WEEKDAYS.map((_, i) => current.filter((row) => new Date(`${row.date}T12:00:00Z`).getUTCDay() === i + 1).reduce((s, r) => s + r.byDepartment[d.id]!, 0));
      return { department: d, count, share: total ? count / total : 0, busiest: WEEKDAYS[byWeekday.indexOf(Math.max(...byWeekday))]! };
    });
  }, [current]);

  const setSearch = (next: Partial<AnalyticsSearch>) => void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });

  const exportCsv = () => {
    const header = ["date", ...departments.map((d) => d.name), "total", "avg_wait_minutes", "no_shows"];
    const lines = current.map((row) => [row.date, ...departments.map((d) => row.byDepartment[d.id]), row.total, row.avgWaitMinutes, row.noShows].join(","));
    const url = URL.createObjectURL(new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: `waitless-appointments-${range}d-${DEMO_TODAY}.csv` }).click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description={`${formatDate(current[0]?.date ?? DEMO_TODAY, "short")} – ${formatDate(current.at(-1)?.date ?? DEMO_TODAY, "short")} · compared with the previous ${range} days`}
        actions={
          <Button variant="secondary" onClick={exportCsv}>
            <Download aria-hidden />
            Export CSV
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Segmented
          label="Date range"
          value={range}
          onChange={(value) => setSearch({ range: value })}
          options={RANGE_OPTIONS.map((o) => ({ value: o.days, label: o.label }))}
        />
        <Select value={department} onChange={(e) => setSearch({ department: e.target.value })} aria-label="Department" className="sm:w-60">
          <option value="all">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile
          label="Appointments"
          value={now.appointments.toLocaleString()}
          icon={CalendarCheck2}
          delta={{ value: change(now.appointments, before.appointments), label: "vs previous period", format: (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%` }}
        />
        <StatTile
          label="Average wait"
          value={`${now.avgWaitMinutes} min`}
          icon={Timer}
          delta={{ value: Math.round((now.avgWaitMinutes - before.avgWaitMinutes) * 10) / 10, label: "check-in to seen", format: (v) => `${v >= 0 ? "+" : ""}${v} min`, upIsGood: false }}
        />
        <StatTile
          label="Completion rate"
          value={percent(now.completionRate)}
          icon={CheckCircle2}
          delta={{ value: (now.completionRate - before.completionRate) * 100, label: "vs previous period", format: (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)} pts` }}
        />
        <StatTile
          label="No-show rate"
          value={percent(now.noShowRate)}
          icon={UserX}
          delta={{ value: (now.noShowRate - before.noShowRate) * 100, label: "vs previous period", format: (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)} pts`, upIsGood: false }}
        />
      </div>

      <Card>
        <CardHeader
          title="Appointments per day"
          description={department === "all" ? "By department" : series[0]?.name}
          actions={
            <Segmented
              label="Display as"
              value={view}
              onChange={setView}
              options={[
                { value: "chart", label: "Chart" },
                { value: "table", label: "Table" },
              ]}
            />
          }
        />
        <CardBody>
          {view === "chart" ? (
            <div className="space-y-4">
              {series.length > 1 && <Legend series={series} />}
              <AppointmentsChart data={current} series={series} />
            </div>
          ) : (
            <DailyTable rows={current} series={series} />
          )}
        </CardBody>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader title="Average wait time" description="Minutes from check-in to the start of the consultation" />
          <CardBody>
            <WaitTimeChart data={current} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Departments" description={`Share of all appointments, last ${range} days`} />
          <CardBody className="space-y-4">
            {breakdown
              .sort((a, b) => b.count - a.count)
              .map(({ department: d, count, share, busiest }) => (
                <div key={d.id}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 font-medium text-slate-800">
                      <span className="size-2.5 rounded-[3px]" style={{ background: DEPARTMENT_COLORS[d.id] }} aria-hidden />
                      {d.name}
                    </span>
                    <span className="tabular text-slate-600">
                      {count.toLocaleString()} · {percent(share)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${share * 100}%`, background: DEPARTMENT_COLORS[d.id] }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Busiest on {busiest}s</p>
                </div>
              ))}
          </CardBody>
        </Card>
      </div>

    </div>
  );
}

function change(now: number, before: number) {
  return before ? ((now - before) / before) * 100 : 0;
}

type DailyRow = DailyStats & { id: string };

function DailyTable({ rows, series }: { rows: DailyStats[]; series: { id: string; name: string }[] }) {
  const columns: ITableHead<DailyRow>[] = [
    { label: "Date", accessor: "date", render: (row) => formatDate(row.date, "weekday") },
    ...series.map(
      (s): ITableHead<DailyRow> => ({
        label: s.name,
        accessor: null,
        align: "right",
        render: (row) => <span className="tabular">{row.byDepartment[s.id]}</span>,
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
  const data = [...rows].reverse().map((row) => ({ ...row, id: row.date }));

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
