import { Skeleton } from "@/components/ui/skeleton";

/**
 * Reusable content skeleton for page loading states.
 * Renders inside the page Layout so sidebar/header remain visible.
 */
export function ContentSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border">
        <div className="border-b border-border px-4 py-3 flex gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex gap-6 border-b border-border last:border-0">
            {Array.from({ length: 5 }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-20" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
