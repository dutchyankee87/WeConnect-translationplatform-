"use client";

import { CloudArrowUpIcon, DocumentIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useState } from 'react';

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  acceptedFormats?: string[];
  maxSize?: number;
  file?: File | null;
  className?: string;
}

export default function UploadDropzone({
  onFileSelect,
  acceptedFormats = ['.docx', '.pdf', '.txt', '.srt'],
  maxSize = 30 * 1024 * 1024, // 30MB default
  file,
  className = '',
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback((selectedFile: File): boolean => {
    setError(null);

    // Check file extension
    const fileExtension = selectedFile.name.slice(selectedFile.name.lastIndexOf('.')).toLowerCase();
    if (!acceptedFormats.some(format => fileExtension === format.toLowerCase())) {
      setError(`Unsupported file format. Accepted: ${acceptedFormats.join(', ')}`);
      return false;
    }

    // Check file size
    if (selectedFile.size > maxSize) {
      setError(`File size exceeds maximum limit of ${(maxSize / (1024 * 1024)).toFixed(0)}MB`);
      return false;
    }

    return true;
  }, [acceptedFormats, maxSize]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && validateFile(droppedFile)) {
      onFileSelect(droppedFile);
    }
  }, [onFileSelect, validateFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && validateFile(selectedFile)) {
      onFileSelect(selectedFile);
    }
  }, [onFileSelect, validateFile]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
    return <DocumentIcon className="w-8 h-8" />;
  };

  return (
    <div className={className}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer
          ${file 
            ? 'border-emerald-400 bg-emerald-50/50' 
            : isDragging 
              ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
              : 'border-slate-300 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/30'
          }
        `}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept={acceptedFormats.join(',')}
          onChange={handleFileInput}
        />

        <div className="flex flex-col items-center justify-center p-12">
          <motion.div
            animate={{ 
              scale: isDragging ? 1.1 : 1,
              rotate: isDragging ? 5 : 0,
            }}
            transition={{ type: "spring", stiffness: 300 }}
            className={`
              p-4 rounded-full mb-4 transition-colors
              ${file 
                ? 'bg-emerald-100' 
                : isDragging 
                  ? 'bg-blue-100' 
                  : 'bg-slate-100'
              }
            `}
          >
            <CloudArrowUpIcon className={`
              w-10 h-10 transition-colors
              ${file 
                ? 'text-emerald-600' 
                : isDragging 
                  ? 'text-blue-600' 
                  : 'text-slate-400'
              }
            `} />
          </motion.div>

          <AnimatePresence mode="wait">
            {file ? (
              <motion.div
                key="file-selected"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="text-center w-full"
              >
                <div className="flex items-center justify-center space-x-3 mb-2">
                  {getFileIcon(file.name)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-emerald-800 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-emerald-600">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Click to select a different file
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="upload-prompt"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <p className={`text-sm font-semibold mb-2 ${
                  isDragging ? 'text-blue-700' : 'text-slate-700'
                }`}>
                  <span className="underline">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-500">
                  {acceptedFormats.join(', ').toUpperCase()} up to {(maxSize / (1024 * 1024)).toFixed(0)}MB
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between"
          >
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

