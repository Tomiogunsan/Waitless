import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Download } from "lucide-react";
import { useMemo } from "react";
import Alert from "@/shared/alert/alert";
import Button from "@/shared/button/button";
import { Card, CardBody, CardHeader } from "@/shared/card/card";
import PageHeader from "@/shared/page-header/page-header";
import Segmented from "@/shared/segmented/segmented";
import Select from "@/shared/select/select";
import { useAppointmentStats } from "@/hooks/use-analytics";
import { useDepartments } from "@/hooks/use-booking";
import {
  clinicDaysBetween,
  dailyPoints,
  dailyPointsCsv,
  departmentShares,
  summarize,
} from "@/utils/analytics";
import { departmentColor } from "@/utils/chart-colors";
import { downloadFile } from "@/utils/download";
import { requireRole } from "@/utils/guards";
import { addDays, clinicToday, formatDate } from "@/utils/time";
import { AnalyticsStats } from "./-components/analytics-stats";
import { AppointmentsCard } from "./-components/appointments-card";
import { WaitTimeChart } from "./-components/charts";
import { DepartmentBreakdown } from "./-components/department-breakdown";
import {
  DEFAULT_RANGE,
  RANGE_OPTIONS,
  isRangeDays,
  type RangeDays,
} from "./-constants/analytics";

// Range and department are search params, so a filtered view can be bookmarked or shared.
interface AnalyticsSearch {
  range: RangeDays;
  department: string;
}

export const Route = createFileRoute("/_modules/admin/")({
  beforeLoad: ({ context }) => requireRole(context.session, ["admin"]),
  validateSearch: (search: Record<string, unknown>): AnalyticsSearch => ({
    range: isRangeDays(search.range) ? (Number(search.range) as RangeDays) : DEFAULT_RANGE,
    department: typeof search.department === "string" && search.department ? search.department : "all",
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { range, department } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: departments = [] } = useDepartments();

  // Whole days only: the current period ends yesterday, the previous one right before it.
  const today = useMemo(() => clinicToday(), []);
  const currentFrom = addDays(today, -range);
  const currentTo = addDays(today, -1);
  const previousFrom = addDays(today, -range * 2);
  const { data: stats = [], isPending, isError } = useAppointmentStats(previousFrom, currentTo);

  const selected = departments.find((d) => d.id === department);
  const visible = useMemo(
    () => (selected ? [selected] : departments),
    [selected, departments],
  );
  const series = visible.map((d) => ({ id: d.id, name: d.name, color: departmentColor(d.name) }));

  const { points, now, before, shares } = useMemo(() => {
    const ids = visible.map((d) => d.id);
    const inView = stats.filter((s) => ids.includes(s.departmentId));
    const current = inView.filter((s) => s.day >= currentFrom);
    const previous = inView.filter((s) => s.day < currentFrom);
    const currentDays = clinicDaysBetween(currentFrom, currentTo);
    const previousDays = clinicDaysBetween(previousFrom, addDays(currentFrom, -1));
    return {
      points: dailyPoints(current, currentDays, ids),
      now: summarize(current, currentDays.length),
      before: summarize(previous, previousDays.length),
      shares: departmentShares(
        stats.filter((s) => s.day >= currentFrom),
        departments,
      ),
    };
  }, [stats, visible, departments, previousFrom, currentFrom, currentTo]);

  const setSearch = (next: Partial<AnalyticsSearch>) =>
    void navigate({ search: (prev) => ({ ...prev, ...next }), replace: true });

  const exportCsv = () =>
    downloadFile(
      `waitless-appointments-${range}d-${today}.csv`,
      dailyPointsCsv(points, series),
      "text/csv",
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description={`${formatDate(currentFrom, "short")} – ${formatDate(currentTo, "short")} · compared with the previous ${range} days`}
        actions={
          <Button variant="secondary" onClick={exportCsv} disabled={isPending}>
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
        <Select
          value={selected ? department : "all"}
          onChange={(e) => setSearch({ department: e.target.value })}
          aria-label="Department"
          className="sm:w-60"
        >
          <option value="all">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
      </div>

      {isError && (
        <Alert
          tone="danger"
          icon={AlertTriangle}
          title="We couldn't load the statistics. Refresh to try again."
        />
      )}

      <div className={isPending ? "animate-pulse opacity-60" : undefined} aria-busy={isPending || undefined}>
        <div className="space-y-6">
          <AnalyticsStats now={now} before={before} />

          <AppointmentsCard
            points={points}
            series={series}
            description={selected ? selected.name : "By department"}
          />

          <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Card>
              <CardHeader
                title="Average wait time"
                description="Minutes from check-in to the start of the consultation"
              />
              <CardBody>
                <WaitTimeChart data={points} />
              </CardBody>
            </Card>
            <DepartmentBreakdown shares={shares} range={range} />
          </div>
        </div>
      </div>
    </div>
  );
}
