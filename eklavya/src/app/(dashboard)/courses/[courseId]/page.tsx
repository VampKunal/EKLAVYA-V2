"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, ChevronLeft, Loader2, Plus, Trash2, X, MessageSquare, GripVertical } from "lucide-react";
import ChatUI from "@/components/ChatUI";

interface Subject {
  _id: string;
  name: string;
  description?: string;
  order: number;
}

interface Course {
  _id: string;
  title: string;
  description: string;
  thumbnail?: string;
  isPublic: boolean;
  subjects: Subject[];
  createdBy: string;
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"modules" | "chat">("modules");

  // Add subject modal
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ name: "", description: "" });
  const [addingSubject, setAddingSubject] = useState(false);
  const [addSubjectError, setAddSubjectError] = useState<string | null>(null);

  useEffect(() => {
    if (courseId) fetchCourse();
  }, [courseId]);

  const fetchCourse = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to load course");
      }
      const data = await res.json();
      setCourse(data.course);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectForm.name.trim()) return;
    setAddingSubject(true);
    setAddSubjectError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/subjects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subjectForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to add module");
      }
      setSubjectForm({ name: "", description: "" });
      setShowAddSubject(false);
      fetchCourse();
    } catch (err: any) {
      setAddSubjectError(err.message);
    } finally {
      setAddingSubject(false);
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!confirm("Delete this module? This cannot be undone.")) return;
    try {
      await fetch(`/api/courses/${courseId}/subjects/${subjectId}`, { method: "DELETE" });
      fetchCourse();
    } catch (err) {
      console.error("Failed to delete subject:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl font-mono text-sm mb-6">
          {error || "Course not found"}
        </div>
        <Link href="/courses" className="inline-flex items-center gap-2 text-orange-600 dark:text-orange-400 font-mono font-bold hover:underline">
          <ChevronLeft className="w-4 h-4" /> Back to Courses
        </Link>
      </div>
    );
  }

  const subjects: Subject[] = (course.subjects || []).sort((a, b) => a.order - b.order);

  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/courses"
          className="inline-flex items-center gap-1.5 text-sm font-mono text-stone-500 dark:text-stone-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Courses
        </Link>
      </div>

      {/* Course Header */}
      <div className="flex flex-col md:flex-row gap-6 mb-8 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md p-6 rounded-2xl border border-orange-100 dark:border-stone-800 shadow-sm">
        <div className="w-full md:w-64 h-44 rounded-2xl bg-gradient-to-br from-orange-100/80 via-amber-50 to-orange-50 dark:from-orange-950/40 dark:to-stone-900 flex items-center justify-center shrink-0 overflow-hidden border border-orange-100 dark:border-stone-800">
          {course.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
          ) : (
            <BookOpen className="w-16 h-16 text-orange-500 opacity-60" />
          )}
        </div>

        <div className="flex-1 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-mono font-bold text-stone-900 dark:text-white mb-2">{course.title}</h1>
                <p className="text-stone-600 dark:text-stone-400 leading-relaxed max-w-xl text-sm">{course.description}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider shrink-0 border ${course.isPublic ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/50" : "bg-stone-100 text-stone-600 border-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700"}`}>
                {course.isPublic ? "Public" : "Private"}
              </span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs font-mono font-semibold text-stone-500 dark:text-stone-400 pt-3 border-t border-stone-100 dark:border-stone-800">
            <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
              <BookOpen className="w-4 h-4" />
              {subjects.length} {subjects.length === 1 ? "Module" : "Modules"}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1.5 bg-orange-50/60 dark:bg-stone-900/60 backdrop-blur border border-orange-100 dark:border-stone-800 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab("modules")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-mono font-bold transition-all ${
            activeTab === "modules"
              ? "bg-white dark:bg-stone-800 text-orange-600 dark:text-orange-400 shadow-sm border border-orange-100 dark:border-stone-700"
              : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
          }`}
        >
          <GripVertical className="w-4 h-4" />
          Modules
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-mono font-bold transition-all ${
            activeTab === "chat"
              ? "bg-white dark:bg-stone-800 text-orange-600 dark:text-orange-400 shadow-sm border border-orange-100 dark:border-stone-700"
              : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          AI Tutor Chat
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "modules" ? (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-mono font-bold text-stone-900 dark:text-white">Course Modules</h2>
            <button
              onClick={() => { setShowAddSubject(true); setAddSubjectError(null); }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-mono font-bold text-sm shadow-md hover:shadow-orange-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Module
            </button>
          </div>

          {subjects.length === 0 ? (
            <div className="text-center py-16 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md rounded-2xl border border-dashed border-orange-200 dark:border-stone-800">
              <BookOpen className="h-12 w-12 text-orange-300 dark:text-stone-700 mx-auto mb-4" />
              <h3 className="text-lg font-mono font-bold text-stone-700 dark:text-stone-300 mb-2">No modules yet</h3>
              <p className="text-stone-500 dark:text-stone-400 font-mono mb-6 text-sm">Add your first module to get started.</p>
              <button
                onClick={() => { setShowAddSubject(true); setAddSubjectError(null); }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-mono font-bold text-sm shadow-md hover:shadow-orange-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add First Module
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {subjects.map((subject, idx) => (
                <div
                  key={subject._id}
                  className="flex items-center gap-4 p-5 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border border-orange-100 dark:border-stone-800 rounded-2xl hover:border-orange-300 dark:hover:border-orange-700/50 shadow-sm transition-all group"
                >
                  <span className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 font-mono text-sm font-bold flex items-center justify-center shrink-0 border border-orange-200 dark:border-orange-900/50">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-mono font-bold text-stone-900 dark:text-white truncate">{subject.name}</h3>
                    {subject.description && (
                      <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1">{subject.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDeleteSubject(subject._id)}
                      className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                      title="Delete module"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="h-[600px]">
          <ChatUI courseId={courseId} courseName={course.title} />
        </div>
      )}

      {/* Add Subject Modal */}
      {showAddSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm px-4">
          <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-md border border-orange-200 dark:border-stone-700 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-orange-100 dark:border-stone-800 bg-orange-50/30 dark:bg-stone-900/30">
              <h2 className="text-xl font-mono font-bold text-stone-900 dark:text-white">Add Module</h2>
              <button onClick={() => setShowAddSubject(false)} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubject} className="p-6 flex flex-col gap-4">
              {addSubjectError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl font-mono text-sm border border-red-200 dark:border-red-800">
                  {addSubjectError}
                </div>
              )}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
                  Module Name <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Introduction to Algebra"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-orange-200 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-white placeholder-stone-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
                  Description <span className="text-stone-400 font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Briefly describe this module..."
                  value={subjectForm.description}
                  onChange={(e) => setSubjectForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-orange-200 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-white placeholder-stone-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSubject(false)}
                  className="flex-1 py-2.5 border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors font-mono font-bold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingSubject}
                  className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-60 text-white rounded-xl font-mono font-bold text-sm shadow-md hover:shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {addingSubject ? <><Loader2 className="w-4 h-4 animate-spin" />Adding...</> : "Add Module"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
