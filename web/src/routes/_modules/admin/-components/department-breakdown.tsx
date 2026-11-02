import { Card, CardBody, CardHeader } from "@/shared/card/card";
import type { DepartmentShare } from "@/types/analytics";
import { formatPercent } from "@/utils/analytics";
import { departmentColor } from "@/utils/chart-colors";

export function DepartmentBreakdown({ shares, range }: { shares: DepartmentShare[]; range: number }) {
  return (
    <Card>
      <CardHeader title="Departments" description={`Share of all appointments, last ${range} days`} />
      <CardBody className="space-y-4">
        {shares.map((d) => (
          <div key={d.departmentId}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 font-medium text-slate-800">
                <span className="size-2.5 rounded-[3px]" style={{ background: departmentColor(d.name) }} aria-hidden />
                {d.name}
              </span>
              <span className="tabular text-slate-600">
                {d.count.toLocaleString()} · {formatPercent(d.share)}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ width: `${d.share * 100}%`, background: departmentColor(d.name) }} />
            </div>
            <p className="mt-1 text-xs text-slate-500">Busiest on {d.busiestDay}s</p>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
