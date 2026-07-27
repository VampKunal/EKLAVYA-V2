"use client";

import { useCourse } from "@/hooks/useCourses";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, MessageSquare, Brain, Loader2, Play } from "lucide-react";
import { useSession } from "next-auth/react";

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  
  // Need a small tweak to useCourse hook to use useParams
  const courseId = params.courseId as string;
  const { course, loading, error } = useCourse(courseId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Course not found</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">{error || "The requested course does not exist."}</p>
        <button onClick={() => router.back()} className="btn btn-primary">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <Link href="/courses" className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline mb-6">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Courses
      </Link>
      
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden mb-8">
        <div className="h-48 md:h-64 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
          {course.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover opacity-40 mix-blend-overlay" />
          )}
          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8 text-white">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium w-max mb-4">
              <BookOpen className="w-3 h-3" /> {course.subjects?.length || 0} Modules
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{course.title}</h1>
            <p className="text-blue-100 max-w-2xl line-clamp-2">{course.description}</p>
          </div>
        </div>
        
        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Your Progress</h3>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-2">
              <div className="bg-green-500 h-2.5 rounded-full" style={{ width: "0%" }}></div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">0% Completed (0 / {course.subjects?.length || 0} modules)</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Link href={`/chat?courseId=${course._id}`} className="btn btn-primary flex-1 sm:flex-none">
              <MessageSquare className="w-4 h-4 mr-2" />
              Tutor Chat
            </Link>
            <Link href={`/quiz?courseId=${course._id}`} className="btn bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex-1 sm:flex-none">
              <Brain className="w-4 h-4 mr-2" />
              Take Quiz
            </Link>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Course Modules</h2>
      
      {course.subjects?.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
          <BookOpen className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No modules yet</h3>
          <p className="text-gray-500 text-sm">Modules are being added to this course.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {course.subjects?.map((subject: any, index: number) => (
            <div key={subject._id || index} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:border-blue-300 dark:hover:border-blue-700 transition-colors flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
                {index + 1}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{subject.name}</h3>
                {subject.description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{subject.description}</p>}
                
                <div className="flex items-center gap-4 mt-3">
                  <Link href={`/chat?courseId=${course._id}&subjectId=${subject._id}`} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center">
                    <Play className="w-3 h-3 mr-1" /> Start Module
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
