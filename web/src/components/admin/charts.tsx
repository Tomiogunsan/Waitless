import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DEPARTMENT_COLORS } from "@/lib/chart-colors";
import { formatDate } from "@/lib/time";
import type { DailyStats } from "@/mocks/analytics";


const GRID = "#e2e8f0";
const TICK = { fill: "#64748b", fontSize: 12 };

export interface Series {
  id: string;
  name: string;
}

export function Legend({ series }: { series: Series[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
      {series.map((s) => (
        <li key={s.id} className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className="size-2.5 rounded-[3px]" style={{ background: DEPARTMENT_COLORS[s.id] }} aria-hidden />
          {s.name}
        </li>
      ))}
    </ul>
  );
}

function TooltipCard({ title, rows, footer }: { title: string; rows: { color?: string; label: string; value: string }[]; footer?: string }) {
  return (
    <div className="min-w-44 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs shadow-pop">
      <p className="mb-1.5 font-semibold text-slate-900">{title}</p>
      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-2 text-slate-600">
            {row.color && <span className="size-2 rounded-[2px]" style={{ background: row.color }} aria-hidden />}
            <span className="flex-1">{row.label}</span>
            <span className="tabular font-medium text-slate-900">{row.value}</span>
          </li>
        ))}
      </ul>
      {footer && <p className="mt-1.5 border-t border-slate-100 pt-1.5 font-medium text-slate-900">{footer}</p>}
    </div>
  );
}

/** Appointments per day, stacked by department. */
export function AppointmentsChart({ data, series }: { data: DailyStats[]; series: Series[] }) {
  const rows = data.map((d) => ({ date: d.date, ...d.byDepartment }));
  const many = rows.length > 30;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: -12 }} barCategoryGap={many ? 1 : "20%"}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={{ stroke: "#cbd5e1" }}
          tick={TICK}
          tickFormatter={(d: string) => formatDate(d, "short")}
          minTickGap={24}
        />
        <YAxis tickLine={false} axisLine={false} tick={TICK} allowDecimals={false} width={40} />
        <Tooltip
          cursor={{ fill: "rgb(37 89 235 / 0.06)" }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const total = payload.reduce((sum, p) => sum + Number(p.value), 0);
            return (
              <TooltipCard
                title={formatDate(String(label), "weekday")}
                rows={[...payload].reverse().map((p) => ({
                  color: DEPARTMENT_COLORS[String(p.dataKey)],
                  label: series.find((s) => s.id === p.dataKey)?.name ?? String(p.dataKey),
                  value: String(p.value),
                }))}
                footer={series.length > 1 ? `${total} appointments` : undefined}
              />
            );
          }}
        />
        {series.map((s, i) => (
          <Bar
            key={s.id}
            dataKey={s.id}
            stackId="appointments"
            fill={DEPARTMENT_COLORS[s.id]}
            stroke="#fff"
            strokeWidth={many ? 0.5 : 1}
            maxBarSize={24}
            radius={i === series.length - 1 ? [4, 4, 0, 0] : 0}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Average wait from check-in to being seen, with the clinic's 15-minute target. */
export function WaitTimeChart({ data }: { data: DailyStats[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="wait-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-series-1)" stopOpacity={0.14} />
            <stop offset="100%" stopColor="var(--color-series-1)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="date" tickLine={false} axisLine={{ stroke: "#cbd5e1" }} tick={TICK} tickFormatter={(d: string) => formatDate(d, "short")} minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} tick={TICK} width={40} tickFormatter={(v: number) => `${v}m`} domain={[0, "auto"]} />
        <ReferenceLine
          y={15}
          stroke="#94a3b8"
          strokeDasharray="4 4"
          label={{ value: "Target 15 min", position: "insideTopRight", fill: "#64748b", fontSize: 11 }}
        />
        <Tooltip
          cursor={{ stroke: "#94a3b8", strokeWidth: 1 }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <TooltipCard
                title={formatDate(String(label), "weekday")}
                rows={[{ color: "var(--color-series-1)", label: "Average wait", value: `${payload[0]!.value} min` }]}
              />
            ) : null
          }
        />
        <Area
          type="monotone"
          dataKey="avgWaitMinutes"
          stroke="var(--color-series-1)"
          strokeWidth={2}
          fill="url(#wait-fill)"
          activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
