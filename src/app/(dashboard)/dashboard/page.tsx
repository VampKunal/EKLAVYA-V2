import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { DashboardClient } from "./DashboardClient";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) {
    redirect("/api/auth/signin");
  }

  return (
      <div className="max-w-6xl mx-auto py-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back, {user?.name || "Student"}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Here is an overview of your recent learning progress.
        </p>

        <DashboardClient />
      </div>
  );
}
