import { Skeleton } from "@/components/ui/Skeleton";

export default function ChatLoading() {
  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-background">
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Assistant Message Skeleton */}
        <div className="flex gap-4 max-w-3xl mr-auto animate-pulse">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-16 w-[300px] sm:w-[400px] rounded-2xl rounded-tl-sm bg-surface" />
          </div>
        </div>

        {/* User Message Skeleton */}
        <div className="flex gap-4 max-w-3xl ml-auto flex-row-reverse animate-pulse">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="space-y-2 flex flex-col items-end">
            <Skeleton className="h-12 w-[200px] sm:w-[250px] rounded-2xl rounded-tr-sm bg-primary/20" />
          </div>
        </div>

        {/* Assistant Message Skeleton */}
        <div className="flex gap-4 max-w-3xl mr-auto animate-pulse">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-32 w-[350px] sm:w-[500px] rounded-2xl rounded-tl-sm bg-surface" />
          </div>
        </div>
      </div>

      {/* Input Area Skeleton */}
      <div className="p-4 border-t border-white/10 bg-surface/50">
        <div className="max-w-4xl mx-auto flex gap-2">
          <Skeleton className="h-14 flex-1 rounded-2xl" />
          <Skeleton className="h-14 w-14 rounded-full shrink-0" />
        </div>
      </div>
    </div>
  );
}
