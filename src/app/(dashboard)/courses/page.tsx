"use client";

import { useState } from "react";
import Link from "next/link";
import { useCourses } from "@/hooks/useCourses";
import { Search, BookOpen, Loader2, Plus, X } from "lucide-react";

export default function CoursesPage() {
  const [search, setSearch] = useState("");
  const { courses, loading, error, refetch } = useCourses();

  // Create course modal state
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", isPublic: false });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    refetch(search);
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to create course");
      }
      setShowModal(false);
      setForm({ title: "", description: "", isPublic: false });
      refetch(); // refresh the list
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-mono font-bold text-stone-900 dark:text-stone-100 tracking-tight mb-2">Explore Courses</h1>
          <p className="text-stone-600 dark:text-stone-400 font-mono text-sm">Discover subjects and accelerate your learning with your AI tutor.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <form onSubmit={handleSearch} className="relative flex-1 md:flex-none">
            <input
              type="text"
              placeholder="Search courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-72 pl-10 pr-4 py-2 border border-orange-200 dark:border-stone-700 rounded-xl bg-white/70 dark:bg-stone-900/70 backdrop-blur-md text-stone-900 dark:text-white placeholder-stone-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-orange-400" />
          </form>
          <button
            onClick={() => { setShowModal(true); setCreateError(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-mono font-bold text-sm shadow-md hover:shadow-orange-500/20 transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            New Course
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl font-mono text-sm mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-20 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md rounded-2xl border border-orange-100 dark:border-stone-800 shadow-sm">
          <BookOpen className="h-12 w-12 text-orange-400 mx-auto mb-4" />
          <h3 className="text-xl font-mono font-bold text-stone-900 dark:text-white mb-2">No courses found</h3>
          <p className="text-stone-500 font-mono text-sm mb-6">
            {search ? "Try adjusting your search query." : "Create your first course to get started."}
          </p>
          {!search && (
            <button
              onClick={() => { setShowModal(true); setCreateError(null); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-mono font-bold shadow-md hover:shadow-orange-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Create a Course
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link key={course._id} href={`/courses/${course._id}`}>
              <div className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-md rounded-2xl border border-orange-100 dark:border-stone-800 overflow-hidden shadow-sm hover:shadow-lg hover:border-orange-300 dark:hover:border-orange-700/50 transition-all duration-300 h-full flex flex-col group">
                <div className="h-44 bg-gradient-to-br from-orange-100/70 via-amber-50 to-orange-50 dark:from-orange-950/40 dark:to-stone-900 flex items-center justify-center p-6 relative overflow-hidden">
                  {course.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover absolute inset-0" />
                  ) : (
                    <BookOpen className="h-16 w-16 text-orange-500 opacity-60 group-hover:scale-110 transition-transform duration-300" />
                  )}
                  <div className="absolute top-3 right-3 bg-white/90 dark:bg-stone-900/90 backdrop-blur border border-orange-200 dark:border-stone-700 text-xs font-mono font-bold px-2.5 py-1 rounded-lg text-orange-600 dark:text-orange-400 shadow-sm">
                    {course.subjects?.length || 0} Modules
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-lg font-mono font-bold text-stone-900 dark:text-white mb-2 line-clamp-1 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{course.title}</h3>
                  <p className="text-stone-600 dark:text-stone-400 text-sm mb-4 line-clamp-2 flex-1">
                    {course.description}
                  </p>
                  <div className="w-full py-2 text-center text-orange-600 dark:text-orange-400 font-mono font-bold text-sm bg-orange-50/50 dark:bg-orange-950/20 group-hover:bg-orange-500 group-hover:text-white rounded-xl transition-all border border-orange-100 dark:border-stone-800">
                    View Course →
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Course Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm px-4">
          <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-md border border-orange-200 dark:border-stone-700 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-orange-100 dark:border-stone-800 bg-orange-50/30 dark:bg-stone-900/30">
              <h2 className="text-xl font-mono font-bold text-stone-900 dark:text-white">Create New Course</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="p-6 flex flex-col gap-4">
              {createError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-mono border border-red-200 dark:border-red-800">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
                  Course Title <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Introduction to Physics"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-orange-200 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-white placeholder-stone-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
                  Description <span className="text-orange-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Briefly describe what this course covers..."
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-orange-200 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-white placeholder-stone-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer select-none py-1">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={form.isPublic}
                    onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))}
                  />
                  <div className={`w-10 h-6 rounded-full transition-colors ${form.isPublic ? "bg-orange-500" : "bg-stone-300 dark:bg-stone-700"}`} />
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isPublic ? "translate-x-4" : "translate-x-0"}`} />
                </div>
                <span className="text-sm font-mono font-semibold text-stone-700 dark:text-stone-300">Make this course public</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors font-mono font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-60 text-white rounded-xl font-mono font-bold text-sm shadow-md hover:shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : "Create Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
