import { cn } from "@/lib/utils";

interface MetricSparklineProps {
  values: number[];
  className?: string;
}

export function MetricSparkline({
  values,
  className,
}: MetricSparklineProps) {
  if (values.length === 0) {
    return <div className={cn("h-12 rounded-md bg-muted/40", className)} />;
  }

  const width = 120;
  const height = 36;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);

  const points = values.map((value, index) => {
    const x =
      values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-12 w-full text-primary/80", className)}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(" ")}
      />
    </svg>
  );
}
