import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) {
    redirect("/api/auth/signin");
  }

  return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back, {user?.name || "Student"}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          This is your dashboard shell. Select a course to start learning.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Dummy course cards */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5 flex flex-col h-full hover:shadow-md transition-shadow">
              <div className="h-40 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-500 mb-4">
                Placeholder Image
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Introduction to Next.js</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 flex-1">
                Learn the basics of Next.js, the React framework for the web.
              </p>
              <button className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                Continue Learning
              </button>
            </div>
          ))}
        </div>
      </div>
  );
}
