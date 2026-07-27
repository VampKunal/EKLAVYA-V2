"use client";

import { useState } from "react";
import Link from "next/link";
import { useCourses } from "@/hooks/useCourses";
import { Search, BookOpen, Loader2 } from "lucide-react";

export default function CoursesPage() {
  const [search, setSearch] = useState("");
  const { courses, loading, error, refetch } = useCourses();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    refetch(search);
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Explore Courses</h1>
          <p className="text-gray-600 dark:text-gray-400">Discover new subjects and start learning with your AI tutor.</p>
        </div>
        
        <form onSubmit={handleSearch} className="w-full md:w-auto relative">
          <input
            type="text"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-80 pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </form>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No courses found</h3>
          <p className="text-gray-500">Try adjusting your search or check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link key={course._id} href={`/courses/${course._id}`}>
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all h-full flex flex-col group">
                <div className="h-48 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 flex items-center justify-center p-6 relative">
                  {course.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover absolute inset-0" />
                  ) : (
                    <BookOpen className="h-16 w-16 text-blue-500 opacity-50 group-hover:scale-110 transition-transform" />
                  )}
                  <div className="absolute top-3 right-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur text-xs font-semibold px-2 py-1 rounded-md text-gray-700 dark:text-gray-300">
                    {course.subjects?.length || 0} Modules
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">{course.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2 flex-1">
                    {course.description}
                  </p>
                  <div className="w-full py-2 text-center text-blue-600 dark:text-blue-400 font-medium text-sm group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 rounded-lg transition-colors">
                    View Course →
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
