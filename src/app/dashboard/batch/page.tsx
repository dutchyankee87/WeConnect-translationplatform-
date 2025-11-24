"use client";

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  DocumentIcon,
  CloudArrowUpIcon,
  LanguageIcon,
  BookOpenIcon,
  SparklesIcon,
  TrashIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const SUPPORTED_FORMATS = {
  '.docx': { maxSize: 30 * 1024 * 1024, label: 'Word Document (.docx, max 30MB)' },
  '.doc': { maxSize: 30 * 1024 * 1024, label: 'Word Document (.doc, max 30MB)' },
  '.pdf': { maxSize: 30 * 1024 * 1024, label: 'PDF Document (.pdf, max 30MB)' },
  '.txt': { maxSize: 1 * 1024 * 1024, label: 'Text File (.txt, max 1MB)' },
  '.srt': { maxSize: 30 * 1024 * 1024, label: 'Subtitle File (.srt, max 30MB)' },
  '.pptx': { maxSize: 30 * 1024 * 1024, label: 'PowerPoint (.pptx, max 30MB)' },
  '.xlsx': { maxSize: 30 * 1024 * 1024, label: 'Excel (.xlsx, max 30MB)' },
};

const LANGUAGES = [
  { code: 'EN', name: 'English' },
  { code: 'DE', name: 'German' },
  { code: 'FR', name: 'French' },
  { code: 'NL', name: 'Dutch' },
  { code: 'ES', name: 'Spanish' },
  { code: 'IT', name: 'Italian' },
  { code: 'PT', name: 'Portuguese' },
];

const FORMAT_CONVERSION_OPTIONS = [
  { from: '.pdf', to: '.docx', label: 'PDF → Word (.docx)' },
  { from: '.doc', to: '.docx', label: 'Word (.doc) → Word (.docx)' },
  { from: '.docx', to: '.pdf', label: 'Word (.docx) → PDF (if supported)' },
];

interface SelectedFile {
  file: File;
  id: string;
  outputFormat?: string;
  status: 'pending' | 'uploading' | 'translating' | 'completed' | 'error';
  progress: number;
  error?: string;
  downloadUrl?: string;
}

interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  processing: number;
}

export default function BatchTranslation() {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [selectedGlossary, setSelectedGlossary] = useState<string>('');
  const [sourceLanguage, setSourceLanguage] = useState<string>('');
  const [targetLanguage, setTargetLanguage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    processing: 0
  });

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const newFiles: SelectedFile[] = [];
    
    Array.from(files).forEach((file) => {
      const fileExtension = file.name.slice(file.name.lastIndexOf('.'));
      const formatInfo = SUPPORTED_FORMATS[fileExtension as keyof typeof SUPPORTED_FORMATS];

      if (!formatInfo) {
        alert(`Unsupported file format: ${file.name}. Please select supported formats.`);
        return;
      }

      if (file.size > formatInfo.maxSize) {
        alert(`File size exceeds the maximum limit: ${file.name} (${formatInfo.maxSize / (1024 * 1024)}MB max)`);
        return;
      }

      // Check for duplicates
      const isDuplicate = selectedFiles.some(f => f.file.name === file.name && f.file.size === file.size);
      if (isDuplicate) {
        alert(`File already selected: ${file.name}`);
        return;
      }

      newFiles.push({
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        status: 'pending',
        progress: 0,
      });
    });

    setSelectedFiles(prev => [...prev, ...newFiles]);
  }, [selectedFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const removeFile = useCallback((fileId: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const updateFileOutputFormat = useCallback((fileId: string, outputFormat: string) => {
    setSelectedFiles(prev => 
      prev.map(f => 
        f.id === fileId 
          ? { ...f, outputFormat: outputFormat === 'original' ? undefined : outputFormat }
          : f
      )
    );
  }, []);

  const startBatchTranslation = async () => {
    if (!sourceLanguage || !targetLanguage || selectedFiles.length === 0) return;

    setIsProcessing(true);
    setBatchProgress({
      total: selectedFiles.length,
      completed: 0,
      failed: 0,
      processing: selectedFiles.length
    });

    try {
      // Create batch job
      const batchResponse = await fetch('/api/batch-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Batch Translation ${new Date().toLocaleString()}`,
          sourceLanguage,
          targetLanguage,
          glossaryId: selectedGlossary || null,
          fileCount: selectedFiles.length,
        }),
      });

      const batchData = await batchResponse.json();
      if (!batchData.success) {
        throw new Error('Failed to create batch job');
      }

      // setBatchJobId(batchData.batchJob.id);

      // Update files to uploading status
      setSelectedFiles(prev => 
        prev.map(f => ({ ...f, status: 'uploading' as const }))
      );

      // Process files concurrently (with rate limiting)
      const concurrentLimit = 4;
      
      for (let i = 0; i < selectedFiles.length; i += concurrentLimit) {
        const batch = selectedFiles.slice(i, i + concurrentLimit);
        
        const batchPromises = batch.map(async (fileData) => {
          try {
            const formData = new FormData();
            formData.append('file', fileData.file);
            formData.append('sourceLanguage', sourceLanguage);
            formData.append('targetLanguage', targetLanguage);
            formData.append('batchJobId', batchData.batchJob.id);
            if (selectedGlossary) {
              formData.append('glossaryId', selectedGlossary);
            }
            if (fileData.outputFormat) {
              formData.append('outputFormat', fileData.outputFormat);
            }

            // Update file status
            setSelectedFiles(prev => 
              prev.map(f => 
                f.id === fileData.id 
                  ? { ...f, status: 'translating', progress: 20 }
                  : f
              )
            );

            const response = await fetch('/api/batch-jobs/translate', {
              method: 'POST',
              body: formData,
            });

            const result = await response.json();
            
            if (result.success) {
              // Update file status to completed
              setSelectedFiles(prev => 
                prev.map(f => 
                  f.id === fileData.id 
                    ? { 
                        ...f, 
                        status: 'completed', 
                        progress: 100,
                        downloadUrl: result.job.outputFilePath
                      }
                    : f
                )
              );

              // Update batch progress
              setBatchProgress(prev => ({
                ...prev,
                completed: prev.completed + 1,
                processing: prev.processing - 1
              }));

            } else {
              throw new Error(result.error || 'Translation failed');
            }

          } catch (error) {
            // Update file status to error
            setSelectedFiles(prev => 
              prev.map(f => 
                f.id === fileData.id 
                  ? { 
                      ...f, 
                      status: 'error', 
                      error: error instanceof Error ? error.message : 'Unknown error'
                    }
                  : f
              )
            );

            // Update batch progress
            setBatchProgress(prev => ({
              ...prev,
              failed: prev.failed + 1,
              processing: prev.processing - 1
            }));
          }
        });

        await Promise.all(batchPromises);
        
        // Small delay between batches
        if (i + concurrentLimit < selectedFiles.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

    } catch (error) {
      console.error('Batch translation error:', error);
      alert('Failed to start batch translation');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadAll = async () => {
    const completedFiles = selectedFiles.filter(f => f.status === 'completed' && f.downloadUrl);
    
    for (const file of completedFiles) {
      try {
        const response = await fetch(`/api/jobs/download?path=${encodeURIComponent(file.downloadUrl!)}`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.file.name.replace(/\.[^/.]+$/, `_translated${file.outputFormat ? file.outputFormat : ''}`);;
        a.click();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Download error:', error);
      }
    }
  };

  const getFileFormatOptions = (fileName: string) => {
    const fileExtension = fileName.slice(fileName.lastIndexOf('.'));
    const availableConversions = FORMAT_CONVERSION_OPTIONS.filter(
      option => option.from === fileExtension
    );
    
    return [
      { value: 'original', label: `Keep original (${fileExtension})` },
      ...availableConversions.map(conv => ({ 
        value: conv.to, 
        label: conv.label 
      }))
    ];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        <div className="mb-10">
          <div className="flex items-center space-x-4 mb-6">
            <motion.div 
              className="flex-shrink-0 p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <DocumentIcon className="h-8 w-8 text-white" />
            </motion.div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
                Batch Translation
              </h1>
              <p className="text-lg text-slate-600 mt-2">
                Upload multiple files and translate them simultaneously with format conversion options
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* File Upload Section */}
          <div className="xl:col-span-2 space-y-6">
            {/* Drag & Drop Upload Area */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">Upload Files</h2>
              
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                  selectedFiles.length > 0 
                    ? 'border-emerald-300 bg-emerald-50' 
                    : 'border-blue-300 bg-blue-50 hover:border-blue-400 hover:bg-blue-100'
                }`}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <CloudArrowUpIcon className={`w-12 h-12 mx-auto mb-4 ${
                  selectedFiles.length > 0 ? 'text-emerald-500' : 'text-blue-500'
                }`} />
                <p className={`text-lg font-medium mb-2 ${
                  selectedFiles.length > 0 ? 'text-emerald-700' : 'text-blue-700'
                }`}>
                  {selectedFiles.length > 0 
                    ? `${selectedFiles.length} files selected` 
                    : 'Drag & drop files here'
                  }
                </p>
                <p className="text-slate-500 mb-4">
                  or click to browse
                </p>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  accept=".docx,.doc,.pdf,.txt,.srt,.pptx,.xlsx"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-medium cursor-pointer hover:from-blue-700 hover:to-indigo-700 transition-all duration-300"
                >
                  Browse Files
                </label>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-slate-600">
                {Object.values(SUPPORTED_FORMATS).map((format, idx) => (
                  <div key={idx} className="flex items-center">
                    <div className="h-2 w-2 bg-blue-400 rounded-full mr-2"></div>
                    {format.label}
                  </div>
                ))}
              </div>
            </div>

            {/* File List */}
            {selectedFiles.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-slate-800">Selected Files</h2>
                  <button
                    onClick={() => setSelectedFiles([])}
                    className="text-slate-500 hover:text-red-500 transition-colors"
                  >
                    Clear All
                  </button>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedFiles.map((fileData) => (
                    <motion.div
                      key={fileData.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="border border-slate-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <DocumentIcon className="h-8 w-8 text-slate-400" />
                          <div>
                            <p className="font-medium text-slate-800">{fileData.file.name}</p>
                            <p className="text-sm text-slate-500">
                              {(fileData.file.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {/* Status Icon */}
                          {fileData.status === 'completed' && (
                            <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                          )}
                          {fileData.status === 'error' && (
                            <XMarkIcon className="h-5 w-5 text-red-500" />
                          )}
                          {(fileData.status === 'translating' || fileData.status === 'uploading') && (
                            <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />
                          )}

                          {/* Remove Button */}
                          {fileData.status === 'pending' && (
                            <button
                              onClick={() => removeFile(fileData.id)}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Format Conversion Options */}
                      {fileData.status === 'pending' && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Output Format:
                          </label>
                          <select
                            value={fileData.outputFormat || 'original'}
                            onChange={(e) => updateFileOutputFormat(fileData.id, e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {getFileFormatOptions(fileData.file.name).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Progress Bar */}
                      {(fileData.status === 'uploading' || fileData.status === 'translating') && (
                        <div className="mt-3">
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${fileData.progress}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {fileData.status === 'uploading' ? 'Uploading...' : 'Translating...'}
                          </p>
                        </div>
                      )}

                      {/* Error Message */}
                      {fileData.status === 'error' && fileData.error && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          {fileData.error}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Settings Panel */}
          <div className="space-y-6">
            {/* Glossary Selection */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center mb-4">
                <BookOpenIcon className="h-6 w-6 text-purple-600 mr-2" />
                <h3 className="text-lg font-semibold text-slate-800">Glossary (Optional)</h3>
              </div>
              <select
                value={selectedGlossary}
                onChange={(e) => setSelectedGlossary(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">No glossary (optional)</option>
                <option value="tech-terms">Technical Terms (EN → DE)</option>
                <option value="marketing">Marketing Terms (EN → FR)</option>
              </select>
            </div>

            {/* Language Selection */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center mb-4">
                <LanguageIcon className="h-6 w-6 text-indigo-600 mr-2" />
                <h3 className="text-lg font-semibold text-slate-800">Languages</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Source Language:
                  </label>
                  <select
                    value={sourceLanguage}
                    onChange={(e) => setSourceLanguage(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select source language</option>
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Target Language:
                  </label>
                  <select
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select target language</option>
                    {LANGUAGES.filter(lang => lang.code !== sourceLanguage).map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Progress Summary */}
            {isProcessing && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Progress</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Total Files:</span>
                    <span className="font-medium">{batchProgress.total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Completed:</span>
                    <span className="font-medium text-emerald-600">{batchProgress.completed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Processing:</span>
                    <span className="font-medium text-blue-600">{batchProgress.processing}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Failed:</span>
                    <span className="font-medium text-red-600">{batchProgress.failed}</span>
                  </div>
                  
                  <div className="mt-4">
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(batchProgress.completed / batchProgress.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <motion.button
                onClick={startBatchTranslation}
                disabled={!sourceLanguage || !targetLanguage || selectedFiles.length === 0 || isProcessing}
                className={`w-full px-6 py-4 rounded-xl font-semibold text-white shadow-lg transition-all duration-300 ${
                  !sourceLanguage || !targetLanguage || selectedFiles.length === 0 || isProcessing
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 hover:shadow-xl'
                }`}
                whileHover={{ scale: isProcessing ? 1 : 1.02 }}
                whileTap={{ scale: isProcessing ? 1 : 0.98 }}
              >
                <div className="flex items-center justify-center space-x-2">
                  {isProcessing ? (
                    <>
                      <ArrowPathIcon className="h-5 w-5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-5 w-5" />
                      <span>Start Batch Translation</span>
                    </>
                  )}
                </div>
              </motion.button>

              {batchProgress.completed > 0 && (
                <motion.button
                  onClick={downloadAll}
                  className="w-full px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-700 hover:to-teal-700 transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Download All ({batchProgress.completed} files)
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}