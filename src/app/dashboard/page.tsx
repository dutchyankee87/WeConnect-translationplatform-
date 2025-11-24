"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentIcon,
  CloudArrowUpIcon,
  LanguageIcon,
  CheckCircleIcon,
  BookOpenIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const SUPPORTED_FORMATS = {
  '.docx': { maxSize: 30 * 1024 * 1024, label: 'Word Document (.docx, max 30MB)' },
  '.pdf': { maxSize: 30 * 1024 * 1024, label: 'PDF Document (.pdf, max 30MB)' },
  '.txt': { maxSize: 1 * 1024 * 1024, label: 'Text File (.txt, max 1MB)' },
  '.srt': { maxSize: 30 * 1024 * 1024, label: 'Subtitle File (.srt, max 30MB)' },
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

interface Step {
  id: number;
  title: string;
  completed: boolean;
}

export default function TranslateNewDocument() {
  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [selectedGlossary, setSelectedGlossary] = useState<string>('');
  const [sourceLanguage, setSourceLanguage] = useState<string>('');
  const [targetLanguage, setTargetLanguage] = useState<string>('');
  const [jobId, setJobId] = useState<string>('');
  const [jobStatus, setJobStatus] = useState<string>('');
  const router = useRouter();

  const steps: Step[] = [
    { id: 1, title: 'Select File', completed: currentStep > 1 },
    { id: 2, title: 'Select Glossary (Optional)', completed: currentStep > 2 },
    { id: 3, title: 'Select Languages', completed: currentStep > 3 },
    { id: 4, title: 'Download Result', completed: currentStep > 4 },
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const fileExtension = selectedFile.name.slice(selectedFile.name.lastIndexOf('.'));
    const formatInfo = SUPPORTED_FORMATS[fileExtension as keyof typeof SUPPORTED_FORMATS];

    if (!formatInfo) {
      alert('Unsupported file format. Please select a .docx, .pdf, .txt, or .srt file.');
      return;
    }

    if (selectedFile.size > formatInfo.maxSize) {
      alert(`File size exceeds the maximum limit of ${formatInfo.maxSize / (1024 * 1024)}MB.`);
      return;
    }

    setFile(selectedFile);
  };

  const proceedToNextStep = () => {
    setCurrentStep(currentStep + 1);
  };

  const handleTranslate = async () => {
    if (!file || !sourceLanguage || !targetLanguage) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('sourceLanguage', sourceLanguage);
    formData.append('targetLanguage', targetLanguage);
    if (selectedGlossary) {
      formData.append('glossaryId', selectedGlossary);
    }

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setJobId(data.job.id);
        setJobStatus(data.job.status);
        proceedToNextStep();
      } else {
        alert('Failed to start translation job');
      }
    } catch (error) {
      alert('An error occurred while starting the translation');
    }
  };

  const checkJobStatus = async () => {
    if (!jobId) return;

    try {
      const response = await fetch(`/api/jobs/${jobId}`);
      const data = await response.json();
      if (data.success) {
        setJobStatus(data.job.status);
      }
    } catch (error) {
      console.error('Failed to check job status', error);
    }
  };

  const downloadResult = async () => {
    if (!jobId) return;

    try {
      const response = await fetch(`/api/jobs/${jobId}/download`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `translated_${file?.name}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Download failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        let errorMessage = 'Failed to download the translated file';
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (response.status === 404) {
          errorMessage = 'Translation file not found';
        } else if (response.status === 400) {
          errorMessage = 'Translation not completed yet';
        }
        
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download the translated file. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        <div className="mb-10">
          <div className="flex items-center space-x-4 mb-6">
            <motion.div 
              className="flex-shrink-0 p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <SparklesIcon className="h-8 w-8 text-white" />
            </motion.div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Translate New Document
              </h1>
              <p className="text-lg text-slate-600 mt-2">
                Transform your documents with AI-powered translation using DeepL's professional API
              </p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-10">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-6">Translation Progress</h2>
            <nav aria-label="Progress">
              <ol className="flex items-center justify-between">
                {steps.map((step, stepIdx) => (
                  <li key={step.id} className="flex-1 group">
                    <div className="flex items-center">
                      <div className={`
                        flex h-12 w-12 items-center justify-center rounded-full border-2 shadow-md transition-all duration-300
                        ${step.completed 
                          ? 'border-emerald-500 bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-200' 
                          : currentStep === step.id 
                            ? 'border-blue-500 bg-gradient-to-r from-blue-500 to-indigo-500 shadow-blue-200' 
                            : 'border-slate-300 bg-white'
                        }
                      `}>
                        {step.completed ? (
                          <CheckCircleIcon className="h-6 w-6 text-white" />
                        ) : (
                          <span className={`text-sm font-bold transition-colors ${
                            currentStep === step.id ? 'text-white' : 'text-slate-400'
                          }`}>
                            {step.id}
                          </span>
                        )}
                      </div>
                      <div className="ml-4 min-w-0 flex-1">
                        <span className={`block text-sm font-medium transition-colors ${
                          step.completed ? 'text-emerald-600' :
                          currentStep === step.id ? 'text-blue-600' : 'text-slate-500'
                        }`}>
                          {step.title}
                        </span>
                      </div>
                    </div>
                    {stepIdx !== steps.length - 1 && (
                      <div className={`hidden sm:block absolute top-6 w-full h-0.5 transition-colors ${
                        step.completed ? 'bg-emerald-300' : 'bg-slate-200'
                      }`} style={{ left: '3rem', right: '-3rem' }} />
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </div>

        {/* Step Content */}
        <motion.div 
          className="bg-white shadow-xl rounded-2xl p-8 border border-slate-100"
          layout
          transition={{ duration: 0.3 }}
        >
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
            <div className="flex items-center mb-6">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <DocumentIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Step 1: Select a File to Upload</h3>
            </div>
            
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Supported formats:
                </label>
                <ul className="text-sm text-slate-600 space-y-2">
                  {Object.values(SUPPORTED_FORMATS).map((format, idx) => (
                    <li key={idx} className="flex items-center">
                      <div className="h-2 w-2 bg-blue-400 rounded-full mr-3"></div>
                      {format.label}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-center w-full">
                <label className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${
                  file 
                    ? 'border-emerald-400 bg-emerald-50 hover:bg-emerald-100' 
                    : 'border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-400'
                }`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className={`p-3 rounded-full mb-4 ${
                      file ? 'bg-emerald-100' : 'bg-blue-100'
                    }`}>
                      <CloudArrowUpIcon className={`w-8 h-8 ${
                        file ? 'text-emerald-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <p className={`mb-2 text-sm ${
                      file ? 'text-emerald-700' : 'text-blue-700'
                    }`}>
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    {file && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-emerald-200">
                        <p className="text-sm text-emerald-800 font-medium">
                          ✓ Selected: {file.name}
                        </p>
                        <p className="text-xs text-emerald-600">
                          Size: {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".docx,.pdf,.txt,.srt"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>

              {file && (
                <div className="flex justify-end">
                  <motion.button
                    onClick={proceedToNextStep}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Continue to Next Step →
                  </motion.button>
                </div>
              )}
            </div>
            </motion.div>
          )}

        {currentStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
          <div>
            <div className="flex items-center mb-6">
              <div className="p-2 bg-purple-100 rounded-lg mr-3">
                <BookOpenIcon className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Step 2: Select a Glossary (Optional)</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Choose a glossary to ensure consistent translations:
                </label>
                <select
                  value={selectedGlossary}
                  onChange={(e) => setSelectedGlossary(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-slate-700 shadow-sm hover:border-slate-400 transition-colors"
                >
                  <option value="">No glossary (optional)</option>
                  <option value="tech-terms">Technical Terms (EN → DE)</option>
                  <option value="marketing">Marketing Terms (EN → FR)</option>
                </select>
              </div>

              <div className="flex justify-end">
                <motion.button
                  onClick={proceedToNextStep}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Continue to Languages →
                </motion.button>
              </div>
            </div>
          </div>
          </motion.div>
        )}

        {currentStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
          <div>
            <div className="flex items-center mb-6">
              <div className="p-2 bg-emerald-100 rounded-lg mr-3">
                <LanguageIcon className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Step 3: Select Languages for Translation</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Source Language:
                </label>
                <select
                  value={sourceLanguage}
                  onChange={(e) => setSourceLanguage(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-slate-700 shadow-sm hover:border-slate-400 transition-colors"
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
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Target Language:
                </label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-slate-700 shadow-sm hover:border-slate-400 transition-colors"
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

            {sourceLanguage && targetLanguage && (
              <div className="flex justify-end">
                <motion.button
                  onClick={handleTranslate}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-3 rounded-lg hover:from-emerald-700 hover:to-teal-700 font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <SparklesIcon className="h-5 w-5" />
                  <span>Start Translation</span>
                </motion.button>
              </div>
            )}
          </div>
          </motion.div>
        )}

        {currentStep === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
          <div>
            <div className="flex items-center mb-6">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Step 4: Translation Status & Download</h3>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-6 rounded-xl border border-slate-200">
                <h4 className="text-lg font-semibold text-slate-800 mb-4">Translation Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <p className="text-sm text-slate-500 mb-1">File</p>
                    <p className="font-medium text-slate-800">{file?.name}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <p className="text-sm text-slate-500 mb-1">Translation</p>
                    <p className="font-medium text-slate-800">{sourceLanguage} → {targetLanguage}</p>
                  </div>
                </div>
                <div className="mt-4 bg-white p-4 rounded-lg shadow-sm">
                  <p className="text-sm text-slate-500 mb-2">Status</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    jobStatus === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                    jobStatus === 'processing' ? 'bg-amber-100 text-amber-800' :
                    jobStatus === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {jobStatus === 'completed' && '✓ '}
                    {jobStatus === 'processing' && '⏳ '}
                    {jobStatus === 'failed' && '⚠ '}
                    {jobStatus?.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <motion.button
                  onClick={checkJobStatus}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  🔄 Refresh Status
                </motion.button>
                
                {jobStatus === 'completed' && (
                  <motion.button
                    onClick={downloadResult}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-emerald-700 hover:to-teal-700 font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    📥 Download File
                  </motion.button>
                )}
              </div>
            </div>
          </div>
          </motion.div>
        )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
    </div>
  );
}