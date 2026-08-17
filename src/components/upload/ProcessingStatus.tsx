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
      <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-stone-900 mb-4">RECENT UPLOADS</h3>
      <div className="space-y-3">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between p-4 bg-white rounded-2xl border border-orange-100 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-50 rounded-xl text-orange-500 border border-orange-100">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="font-mono font-bold text-stone-900 truncate max-w-[200px] sm:max-w-[300px] text-sm">
                  {file.name}
                </p>
                {file.size && (
                  <p className="text-xs font-mono text-stone-400 mt-0.5">{file.size}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 font-mono text-xs font-bold">
              {file.status === "completed" && (
                <span className="flex items-center text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                  Ready
                </span>
              )}
              {file.status === "processing" && (
                <span className="flex items-center text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full">
                  <Clock className="w-3.5 h-3.5 mr-1 text-orange-500 animate-pulse" />
                  Processing
                </span>
              )}
              {file.status === "failed" && (
                <span className="flex items-center text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
                  <XCircle className="w-3.5 h-3.5 mr-1 text-rose-500" />
                  Failed
                </span>
              )}
              {file.status === "pending" && (
                <span className="flex items-center text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                  <Clock className="w-3.5 h-3.5 mr-1 text-amber-500" />
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
