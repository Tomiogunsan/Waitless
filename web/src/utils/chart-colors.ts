// Colour follows the department, never its rank, so filtering never repaints a series.
const DEPARTMENT_COLORS: Record<string, string> = {
  "General Medicine": "var(--color-series-1)",
  Paediatrics: "var(--color-series-2)",
  "Obstetrics & Gynaecology": "var(--color-series-3)",
  Dermatology: "var(--color-series-4)",
};

export function departmentColor(name: string): string {
  return DEPARTMENT_COLORS[name] ?? "var(--color-slate-400)";
}
