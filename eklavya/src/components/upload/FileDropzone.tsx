"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, File, X, Loader2 } from "lucide-react";
import { Button } from "../ui/Button";

interface FileDropzoneProps {
  onFileUpload: (file: File) => void;
  isUploading: boolean;
}

export function FileDropzone({ onFileUpload, isUploading }: FileDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    if (validTypes.includes(file.type) || file.name.endsWith(".pdf") || file.name.endsWith(".docx") || file.name.endsWith(".txt")) {
      setSelectedFile(file);
    } else {
      alert("Unsupported file type. Please upload a PDF, DOCX, or TXT file.");
    }
  };

  const handleSubmit = () => {
    if (selectedFile) {
      onFileUpload(selectedFile);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <div
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all shadow-md ${
          dragActive
            ? "border-orange-500 bg-orange-50/80 shadow-orange-500/10 scale-[1.01]"
            : "border-orange-200/80 bg-white hover:border-orange-400 hover:bg-orange-50/30"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleChange}
          className="hidden"
        />
        
        {selectedFile ? (
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-orange-100/80 rounded-2xl text-orange-600 border border-orange-200 shadow-sm">
              <File className="w-8 h-8" />
            </div>
            <div>
              <p className="text-lg font-mono font-bold text-stone-900">{selectedFile.name}</p>
              <p className="text-xs font-mono text-stone-400 mt-1">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <div className="flex gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => setSelectedFile(null)}
                disabled={isUploading}
                className="font-mono font-bold border-orange-200 text-stone-700 hover:bg-orange-50"
              >
                <X className="w-4 h-4 mr-1.5" />
                Clear
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isUploading}
                className="font-mono font-bold bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4 mr-2" />
                    Upload File
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-orange-50 rounded-2xl text-orange-500 border border-orange-100 shadow-sm">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div>
              <p className="text-lg font-mono font-bold text-stone-900">
                DRAG AND DROP YOUR FILE HERE
              </p>
              <p className="text-xs font-mono text-stone-500 mt-1">
                Supports PDF, DOCX, and TXT (Max 10MB)
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => inputRef.current?.click()}
              className="mt-4 font-mono font-bold border-orange-200 text-stone-700 hover:bg-orange-50"
            >
              Select File
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
