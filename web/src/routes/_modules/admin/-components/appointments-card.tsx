import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/shared/card/card";
import Segmented from "@/shared/segmented/segmented";
import type { ChartSeries, DailyPoint } from "@/types/analytics";
import { AppointmentsChart, Legend } from "./charts";
import { DailyTable } from "./daily-table";

export function AppointmentsCard({
  points,
  series,
  description,
}: {
  points: DailyPoint[];
  series: ChartSeries[];
  description: string;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");

  return (
    <Card>
      <CardHeader
        title="Appointments per day"
        description={description}
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
            <AppointmentsChart data={points} series={series} />
          </div>
        ) : (
          <DailyTable points={points} series={series} />
        )}
      </CardBody>
    </Card>
  );
}
