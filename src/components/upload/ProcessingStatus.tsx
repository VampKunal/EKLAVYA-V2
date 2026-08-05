"use client";

import React from "react";
import { CheckCircle2, Clock, XCircle, FileText } from "lucide-react";

export type UploadStatus = "pending" | "processing" | "completed" | "failed";

interface ProcessingStatusProps {
  files: {
    id: string;
    name: string;
    status: UploadStatus;
    size?: string;
  }[];
}

export function ProcessingStatus({ files }: ProcessingStatusProps) {
  if (files.length === 0) return null;

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <h3 className="text-lg font-semibold text-gray-200 mb-4">Recent Uploads</h3>
      <div className="space-y-3">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-800"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-800 rounded-md">
                <FileText className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="font-medium text-gray-200 truncate max-w-[200px] sm:max-w-[300px]">
                  {file.name}
                </p>
                {file.size && (
                  <p className="text-xs text-gray-500">{file.size}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {file.status === "completed" && (
                <span className="flex items-center text-sm text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Ready
                </span>
              )}
              {file.status === "processing" && (
                <span className="flex items-center text-sm text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full">
                  <Clock className="w-4 h-4 mr-1 animate-pulse" />
                  Processing
                </span>
              )}
              {file.status === "failed" && (
                <span className="flex items-center text-sm text-red-400 bg-red-400/10 px-2 py-1 rounded-full">
                  <XCircle className="w-4 h-4 mr-1" />
                  Failed
                </span>
              )}
              {file.status === "pending" && (
                <span className="flex items-center text-sm text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full">
                  <Clock className="w-4 h-4 mr-1" />
                  Pending
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
