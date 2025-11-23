"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
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
      }
    } catch (error) {
      alert('Failed to download the translated file');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl"
    >
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center space-x-3 mb-4">
          <motion.div
            animate={{ rotate: currentStep === 4 ? 360 : 0 }}
            transition={{ duration: 0.5 }}
            className="flex-shrink-0"
          >
            <SparklesIcon className="h-8 w-8 text-indigo-600" />
          </motion.div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Translate New Document
          </h1>
        </div>
        <p className="text-lg text-gray-600">
          Transform your documents with AI-powered translation using DeepL's professional API
        </p>
      </motion.div>

      {/* Progress Steps */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="mb-8"
      >
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {steps.map((step, stepIdx) => (
              <motion.li 
                key={step.id} 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + stepIdx * 0.1, duration: 0.4 }}
                className={`${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''} relative`}
              >
                <div className="flex items-center">
                  <motion.div 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      flex h-12 w-12 items-center justify-center rounded-full border-2 shadow-lg
                      ${step.completed 
                        ? 'border-indigo-600 bg-gradient-to-r from-indigo-600 to-purple-600' 
                        : currentStep === step.id 
                          ? 'border-indigo-600 bg-white ring-4 ring-indigo-100' 
                          : 'border-gray-300 bg-white'
                      }
                    `}
                  >
                    {step.completed ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                      >
                        <CheckCircleIcon className="h-6 w-6 text-white" />
                      </motion.div>
                    ) : (
                      <span className={`text-sm font-bold ${
                        currentStep === step.id ? 'text-indigo-600' : 'text-gray-500'
                      }`}>
                        {step.id}
                      </span>
                    )}
                  </motion.div>
                  <span className={`ml-4 text-sm font-semibold ${
                    currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {stepIdx !== steps.length - 1 && (
                  <div className={`absolute top-6 left-6 -ml-px h-0.5 w-8 sm:w-20 ${
                    step.completed ? 'bg-gradient-to-r from-indigo-600 to-purple-600' : 'bg-gray-300'
                  }`} />
                )}
              </motion.li>
            ))}
          </ol>
        </nav>
      </motion.div>

      {/* Step Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="bg-white shadow-xl rounded-2xl p-8 border border-gray-100"
      >
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center mb-6">
                <motion.div
                  whileHover={{ rotate: 10 }}
                  className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4"
                >
                  <DocumentIcon className="h-6 w-6 text-white" />
                </motion.div>
                <h3 className="text-2xl font-bold text-gray-900">Upload Your Document</h3>
              </div>
            
              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <label className="block text-lg font-semibold text-gray-800 mb-4">
                    Supported Formats
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.values(SUPPORTED_FORMATS).map((format, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + idx * 0.1 }}
                        className="flex items-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100"
                      >
                        <DocumentIcon className="h-5 w-5 text-indigo-600 mr-3" />
                        <span className="text-sm font-medium text-gray-700">{format.label}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                  className="flex items-center justify-center w-full"
                >
                  <motion.label 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 ${
                      file 
                        ? 'border-green-400 bg-green-50 hover:bg-green-100' 
                        : 'border-indigo-300 bg-gradient-to-br from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <motion.div
                        animate={{ 
                          y: file ? 0 : [0, -5, 0],
                          rotate: file ? 360 : 0
                        }}
                        transition={{ 
                          y: { duration: 2, repeat: Infinity },
                          rotate: { duration: 0.5 }
                        }}
                        className="mb-4"
                      >
                        {file ? (
                          <CheckCircleIcon className="w-12 h-12 text-green-500" />
                        ) : (
                          <CloudArrowUpIcon className="w-12 h-12 text-indigo-500" />
                        )}
                      </motion.div>
                      
                      {file ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-center"
                        >
                          <p className="text-lg font-semibold text-green-700 mb-2">
                            File Selected Successfully!
                          </p>
                          <p className="text-sm text-gray-700 font-medium">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                          </p>
                        </motion.div>
                      ) : (
                        <div className="text-center">
                          <p className="mb-2 text-lg font-semibold text-gray-700">
                            <span className="text-indigo-600">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-sm text-gray-500">
                            Your document will be processed securely
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
                  </motion.label>
                </motion.div>

                {file && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-end"
                  >
                    <motion.button
                      whileHover={{ scale: 1.05, backgroundColor: '#4338ca' }}
                      whileTap={{ scale: 0.95 }}
                      onClick={proceedToNextStep}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      Continue to Next Step
                    </motion.button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center mb-6">
                <motion.div
                  whileHover={{ rotate: 10 }}
                  className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4"
                >
                  <BookOpenIcon className="h-6 w-6 text-white" />
                </motion.div>
                <h3 className="text-2xl font-bold text-gray-900">Choose a Glossary</h3>
              </div>

              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <label className="block text-lg font-semibold text-gray-800 mb-4">
                    Select a Glossary for Consistent Terminology
                  </label>
                  <p className="text-gray-600 mb-4">
                    Glossaries help maintain consistent translations across your documents by preserving specific term translations.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="relative"
                >
                  <select
                    value={selectedGlossary}
                    onChange={(e) => setSelectedGlossary(e.target.value)}
                    className="w-full px-4 py-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-green-100 focus:border-green-400 text-gray-800 font-medium transition-all duration-300 appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-white">No glossary (optional)</option>
                    <option value="tech-terms" className="bg-white">🔧 Technical Terms (EN → DE)</option>
                    <option value="marketing" className="bg-white">📢 Marketing Terms (EN → FR)</option>
                  </select>
                  <motion.div
                    className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none"
                    animate={{ rotate: selectedGlossary ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </motion.div>
                </motion.div>

                {selectedGlossary && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    className="bg-gradient-to-r from-green-100 to-emerald-100 p-4 rounded-xl border border-green-200"
                  >
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                      <p className="text-green-800 font-medium">
                        {selectedGlossary === 'tech-terms' ? 'Technical Terms glossary selected' : 'Marketing Terms glossary selected'}
                      </p>
                    </div>
                    <p className="text-green-700 text-sm mt-1">
                      Your translations will use predefined terminology for consistency.
                    </p>
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex justify-end"
                >
                  <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: '#059669' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={proceedToNextStep}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    Continue to Languages
                  </motion.button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center mb-6">
                <motion.div
                  whileHover={{ rotate: 10 }}
                  className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mr-4"
                >
                  <LanguageIcon className="h-6 w-6 text-white" />
                </motion.div>
                <h3 className="text-2xl font-bold text-gray-900">Select Languages</h3>
              </div>

              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <label className="block text-lg font-semibold text-gray-800 mb-4">
                    Choose Source and Target Languages
                  </label>
                  <p className="text-gray-600 mb-6">
                    Select the language of your document and the language you want to translate it to.
                  </p>
                </motion.div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <label className="block text-md font-semibold text-gray-700 mb-3">
                      🔤 Source Language:
                    </label>
                    <div className="relative">
                      <select
                        value={sourceLanguage}
                        onChange={(e) => setSourceLanguage(e.target.value)}
                        className="w-full px-4 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 text-gray-800 font-medium transition-all duration-300 appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-white">Select source language</option>
                        {LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code} className="bg-white">
                            {lang.name}
                          </option>
                        ))}
                      </select>
                      <motion.div
                        className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none"
                        animate={{ rotate: sourceLanguage ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </motion.div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <label className="block text-md font-semibold text-gray-700 mb-3">
                      🎯 Target Language:
                    </label>
                    <div className="relative">
                      <select
                        value={targetLanguage}
                        onChange={(e) => setTargetLanguage(e.target.value)}
                        className="w-full px-4 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-100 focus:border-purple-400 text-gray-800 font-medium transition-all duration-300 appearance-none cursor-pointer"
                      >
                        <option value="" className="bg-white">Select target language</option>
                        {LANGUAGES.filter(lang => lang.code !== sourceLanguage).map((lang) => (
                          <option key={lang.code} value={lang.code} className="bg-white">
                            {lang.name}
                          </option>
                        ))}
                      </select>
                      <motion.div
                        className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none"
                        animate={{ rotate: targetLanguage ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </motion.div>
                    </div>
                  </motion.div>
                </div>

                {sourceLanguage && targetLanguage && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-r from-blue-100 to-purple-100 p-6 rounded-2xl border border-blue-200"
                  >
                    <div className="flex items-center justify-center mb-4">
                      <motion.div
                        animate={{ x: [0, 10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex items-center space-x-4"
                      >
                        <div className="bg-white px-4 py-2 rounded-lg shadow-md">
                          <span className="font-semibold text-blue-700">
                            {LANGUAGES.find(lang => lang.code === sourceLanguage)?.name}
                          </span>
                        </div>
                        <motion.div
                          animate={{ rotate: [0, 180, 360] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </motion.div>
                        <div className="bg-white px-4 py-2 rounded-lg shadow-md">
                          <span className="font-semibold text-purple-700">
                            {LANGUAGES.find(lang => lang.code === targetLanguage)?.name}
                          </span>
                        </div>
                      </motion.div>
                    </div>
                    <p className="text-center text-gray-700 font-medium">
                      Ready to translate from {LANGUAGES.find(lang => lang.code === sourceLanguage)?.name} to {LANGUAGES.find(lang => lang.code === targetLanguage)?.name}
                    </p>
                  </motion.div>
                )}

                {sourceLanguage && targetLanguage && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex justify-end"
                  >
                    <motion.button
                      whileHover={{ scale: 1.05, backgroundColor: '#059669' }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleTranslate}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2"
                    >
                      <SparklesIcon className="h-5 w-5" />
                      <span>Start Translation</span>
                    </motion.button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center mb-6">
                <motion.div
                  whileHover={{ rotate: 10 }}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-4"
                >
                  <CheckCircleIcon className="h-6 w-6 text-white" />
                </motion.div>
                <h3 className="text-2xl font-bold text-gray-900">Translation Complete!</h3>
              </div>

              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="bg-white p-4 rounded-xl shadow-sm"
                    >
                      <div className="flex items-center mb-2">
                        <DocumentIcon className="h-5 w-5 text-blue-600 mr-2" />
                        <span className="font-semibold text-gray-700">File</span>
                      </div>
                      <p className="text-sm text-gray-600 font-medium truncate">
                        {file?.name}
                      </p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 }}
                      className="bg-white p-4 rounded-xl shadow-sm"
                    >
                      <div className="flex items-center mb-2">
                        <LanguageIcon className="h-5 w-5 text-purple-600 mr-2" />
                        <span className="font-semibold text-gray-700">Translation</span>
                      </div>
                      <p className="text-sm text-gray-600 font-medium">
                        {LANGUAGES.find(lang => lang.code === sourceLanguage)?.name} → {LANGUAGES.find(lang => lang.code === targetLanguage)?.name}
                      </p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 }}
                      className="bg-white p-4 rounded-xl shadow-sm"
                    >
                      <div className="flex items-center mb-2">
                        <motion.div
                          animate={{ 
                            rotate: jobStatus === 'processing' ? 360 : 0 
                          }}
                          transition={{ 
                            duration: 1, 
                            repeat: jobStatus === 'processing' ? Infinity : 0 
                          }}
                        >
                          <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                        </motion.div>
                        <span className="font-semibold text-gray-700">Status</span>
                      </div>
                      <motion.span 
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                          jobStatus === 'completed' ? 'bg-green-100 text-green-800' :
                          jobStatus === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                          jobStatus === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                        {jobStatus || 'READY'}
                      </motion.span>
                    </motion.div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex flex-col sm:flex-row gap-4 justify-center"
                >
                  <motion.button
                    whileHover={{ scale: 1.05, backgroundColor: '#2563eb' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={checkJobStatus}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </motion.div>
                    <span>Refresh Status</span>
                  </motion.button>
                  
                  {jobStatus === 'completed' && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.05, backgroundColor: '#059669' }}
                      whileTap={{ scale: 0.95 }}
                      onClick={downloadResult}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-2"
                    >
                      <motion.div
                        animate={{ y: [0, -3, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <CloudArrowDownIcon className="h-5 w-5" />
                      </motion.div>
                      <span>Download Translation</span>
                    </motion.button>
                  )}
                </motion.div>

                {jobStatus === 'completed' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-2xl border border-blue-200 text-center"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="mb-4"
                    >
                      🎉
                    </motion.div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">
                      Translation Successfully Completed!
                    </h4>
                    <p className="text-gray-600">
                      Your document has been professionally translated and is ready for download.
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
      </div>
    </div>
  );
}