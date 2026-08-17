import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
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
        <h1 className="text-3xl font-mono font-bold text-stone-900 tracking-tight mb-2">
          Welcome back, {user?.name || "Student"}!
        </h1>
        <p className="text-stone-600 font-mono text-sm mb-8">
          Here is an overview of your recent learning progress.
        </p>

        <DashboardClient />
      </div>
  );
}
