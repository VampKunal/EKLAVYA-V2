"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FileDropzone } from "@/components/upload/FileDropzone";
import { ProcessingStatus, UploadStatus } from "@/components/upload/ProcessingStatus";
import { useCourses } from "@/hooks/useCourses";
import { Loader2, BookPlus } from "lucide-react";

export default function UploadPage() {
  const { courses, loading } = useCourses();
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<{ id: string; name: string; status: UploadStatus; size?: string }[]>([]);

  const handleFileUpload = async (file: File) => {
    if (!selectedCourseId) {
      alert("Please select a course first.");
      return;
    }

    setIsUploading(true);
    
    const fileId = Math.random().toString(36).substring(7);
    setFiles((prev) => [
      { id: fileId, name: file.name, status: "processing", size: (file.size / 1024 / 1024).toFixed(2) + " MB" },
      ...prev,
    ]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("courseId", selectedCourseId);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, status: "completed" } : f))
      );
    } catch (error: any) {
      console.error(error);
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, status: "failed" } : f))
      );
      alert(error.message || "An error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Upload Course Materials</h1>
        <p className="text-gray-400">
          Upload PDFs, DOCX, or text files to add knowledge to your courses.
          Our AI will process them and make them available for chat and quizzes.
        </p>
      </div>

      <div className="mb-8 flex justify-center">
        <div className="w-full max-w-sm">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Course
          </label>
          {loading ? (
            <div className="flex items-center text-gray-400">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading courses...
            </div>
          ) : courses.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-4 border border-dashed border-gray-600 rounded-lg text-center">
              <BookPlus className="w-8 h-8 text-gray-500" />
              <p className="text-sm text-gray-400">
                You don&apos;t have any courses yet.
                <br />
                Create a course first, then come back to upload files.
              </p>
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <BookPlus className="w-4 h-4" />
                Create a Course
              </Link>
            </div>
          ) : (
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">-- Choose a course --</option>
              {courses.map((course) => (
                <option key={course._id} value={course._id}>
                  {course.title}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <FileDropzone onFileUpload={handleFileUpload} isUploading={isUploading} />
      
      <ProcessingStatus files={files} />
    </div>
  );
}
