import { cn } from "@/utils/cn";

interface TableLoaderProps {
  columns: number;
  rows?: number;

  message?: string;
}


export default function TableLoader({ columns, rows = 5, message }: TableLoaderProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row} aria-hidden>
          {Array.from({ length: columns }, (_, col) => (
            <td key={col} className="px-4 py-4">
              <div
                className={cn(
                  "h-3.5 animate-pulse rounded-full bg-slate-100",
                  col === 0 ? "w-40" : "w-24",
                  // Vary widths so the skeleton doesn't look like a grid.
                  row % 2 === 1 && col !== 0 && "w-16",
                )}
              />
            </td>
          ))}
        </tr>
      ))}
      <tr>
        <td colSpan={columns} className="px-4 pb-4 text-center text-sm text-slate-500" role="status">
          {message ?? <span className="sr-only">Loading</span>}
        </td>
      </tr>
    </>
  );
}
