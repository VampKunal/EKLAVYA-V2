"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Dashboard error:", error);
    toast.error("An unexpected error occurred: " + error.message);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
      <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6 text-4xl">
        !
      </div>
      <h2 className="text-3xl font-bold mb-4">Something went wrong!</h2>
      <p className="text-foreground/70 mb-8 max-w-md">
        We encountered an unexpected error while loading this page. Our team has been notified.
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-surface border border-white/10 rounded-full hover:bg-white/5 transition-colors"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="px-6 py-3 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
