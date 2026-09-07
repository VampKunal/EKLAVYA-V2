import { Skeleton } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-8 animate-pulse">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
      </div>
      
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-6 rounded-2xl bg-surface border border-white/5">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-10 w-24" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Area */}
        <div className="col-span-2 p-6 rounded-2xl bg-surface border border-white/5">
          <Skeleton className="h-8 w-40 mb-6" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>

        {/* Weak Topics */}
        <div className="p-6 rounded-2xl bg-surface border border-white/5">
          <Skeleton className="h-8 w-40 mb-6" />
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
