import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { AnalyticsClient } from "./AnalyticsClient";

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  return (
    <div className="max-w-6xl mx-auto py-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Detailed Analytics
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Deep dive into your performance and knowledge retention.
      </p>

      <AnalyticsClient />
    </div>
  );
}
