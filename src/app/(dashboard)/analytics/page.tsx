import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AnalyticsClient } from "./AnalyticsClient";

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  return (
    <div className="max-w-6xl mx-auto py-6">
      <h1 className="text-3xl font-mono font-bold text-stone-900 tracking-tight mb-2">
        Detailed Analytics
      </h1>
      <p className="text-stone-600 font-mono text-sm mb-8">
        Deep dive into your performance and knowledge retention.
      </p>

      <AnalyticsClient />
    </div>
  );
}
