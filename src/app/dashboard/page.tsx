"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DocumentIcon,
  LanguageIcon,
  CheckCircleIcon,
  BookOpenIcon,
  SparklesIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import Stepper from '@/components/ui/Stepper';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import UploadDropzone from '@/components/ui/UploadDropzone';
import Tooltip from '@/components/ui/Tooltip';
import EmptyState from '@/components/ui/EmptyState';

const SUPPORTED_FORMATS = {
  '.docx': { maxSize: 30 * 1024 * 1024, label: 'Word Document (.docx, max 30MB)' },
  '.pdf': { maxSize: 30 * 1024 * 1024, label: 'PDF Document (.pdf, max 30MB)' },
  '.txt': { maxSize: 1 * 1024 * 1024, label: 'Text File (.txt, max 1MB)' },
  '.srt': { maxSize: 30 * 1024 * 1024, label: 'Subtitle File (.srt, max 30MB)' },
};

const LANGUAGES = [
  { code: 'EN', name: 'English', flag: '🇬🇧' },
  { code: 'DE', name: 'German', flag: '🇩🇪' },
  { code: 'FR', name: 'French', flag: '🇫🇷' },
  { code: 'NL', name: 'Dutch', flag: '🇳🇱' },
  { code: 'ES', name: 'Spanish', flag: '🇪🇸' },
  { code: 'IT', name: 'Italian', flag: '🇮🇹' },
  { code: 'PT', name: 'Portuguese', flag: '🇵🇹' },
];

interface Step {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
}

interface Glossary {
  id: string;
  name: string;
  entriesCount: number;
  sourceLanguage: string;
  targetLanguage: string;
  hasLearningAI?: boolean;
}

export default function TranslateNewDocument() {
  const [currentStep, setCurrentStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [selectedGlossary, setSelectedGlossary] = useState<string>('');
  const [glossaries, setGlossaries] = useState<Glossary[]>([]);
  const [sourceLanguage, setSourceLanguage] = useState<string>('');
  const [targetLanguage, setTargetLanguage] = useState<string>('');
  const [targetLanguages, setTargetLanguages] = useState<string[]>([]);
  const [isMultiLanguage, setIsMultiLanguage] = useState<boolean>(false);
  const [jobId, setJobId] = useState<string>('');
  const [jobStatus, setJobStatus] = useState<string>('');
  const [childJobs, setChildJobs] = useState<any[]>([]);
  const [learningStats, setLearningStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Fetch glossaries on mount
  useEffect(() => {
    fetchGlossaries();
  }, []);

  // Fetch learning stats when language selections change
  useEffect(() => {
    if (sourceLanguage && ((isMultiLanguage && targetLanguages.length > 0) || (!isMultiLanguage && targetLanguage))) {
      fetchLearningStats();
    }
  }, [sourceLanguage, targetLanguage, targetLanguages, isMultiLanguage]);

  const steps: Step[] = [
    { 
      id: 1, 
      title: 'Upload File', 
      description: 'Select your document',
      completed: currentStep > 1 
    },
    { 
      id: 2, 
      title: 'Glossary', 
      description: 'Optional terminology',
      completed: currentStep > 2 
    },
    { 
      id: 3, 
      title: 'Languages', 
      description: 'Choose translation',
      completed: currentStep > 3 
    },
    { 
      id: 4, 
      title: 'Complete', 
      description: 'Download result',
      completed: currentStep > 4 
    },
  ];

  const fetchGlossaries = async () => {
    try {
      const response = await fetch('/api/glossaries');
      const data = await response.json();
      if (data.success) {
        setGlossaries(data.glossaries || []);
      }
    } catch (error) {
      console.error('Failed to fetch glossaries:', error);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
  };

  const proceedToNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const proceedToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleTranslate = async () => {
    if (!file || !sourceLanguage || (!targetLanguage && !targetLanguages.length)) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sourceLanguage', sourceLanguage);
    
    if (isMultiLanguage) {
      formData.append('targetLanguages', JSON.stringify(targetLanguages));
      formData.append('isMultiLanguage', 'true');
    } else {
      formData.append('targetLanguage', targetLanguage);
    }
    
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
        setCurrentStep(4);
        // Start polling for status
        if (data.job.status !== 'completed') {
          pollJobStatus(data.job.id);
        }
      } else {
        alert('Failed to start translation job');
      }
    } catch (error) {
      alert('An error occurred while starting the translation');
    } finally {
      setLoading(false);
    }
  };

  const pollJobStatus = async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/jobs/${id}`);
        const data = await response.json();
        if (data.success) {
          setJobStatus(data.job.status);
          if (data.childJobs) {
            setChildJobs(data.childJobs);
          }
          if (data.job.status === 'completed' || data.job.status === 'failed') {
            clearInterval(interval);
          }
        }
      } catch (error) {
        console.error('Failed to check job status', error);
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  };

  const checkJobStatus = async () => {
    if (!jobId) return;
    await pollJobStatus(jobId);
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
        alert('Translation not ready yet. Please wait for processing to complete.');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download the translated file. Please try again.');
    }
  };

  const downloadLanguageResult = async (childJobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${childJobId}/download`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        const childJob = childJobs.find(job => job.id === childJobId);
        const langName = LANGUAGES.find(l => l.code === childJob?.targetLanguage)?.name || childJob?.targetLanguage;
        a.download = `translated_${langName}_${file?.name}`;
        
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download translation for this language');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download the translated file. Please try again.');
    }
  };

  const fetchLearningStats = async () => {
    if (!sourceLanguage || (!targetLanguage && !targetLanguages.length)) return;

    const languages = isMultiLanguage ? targetLanguages : [targetLanguage];
    
    try {
      const statsPromises = languages.map(async (lang) => {
        const response = await fetch(`/api/learning/stats?sourceLanguage=${sourceLanguage}&targetLanguage=${lang}`);
        const data = await response.json();
        return { language: lang, stats: data.success ? data.stats : null };
      });

      const results = await Promise.all(statsPromises);
      setLearningStats(results);
    } catch (error) {
      console.error('Failed to fetch learning stats:', error);
    }
  };

  const canProceedFromStep1 = file !== null;
  const canProceedFromStep2 = true; // Glossary is optional
  const canProceedFromStep3 = sourceLanguage && ((isMultiLanguage && targetLanguages.length > 0) || (!isMultiLanguage && targetLanguage));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
              <SparklesIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Translate Document
              </h1>
              <p className="text-lg text-slate-600 mt-2">
                Professional AI-powered translation platform
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stepper */}
        <Card className="mb-8" padding="lg">
          <Stepper steps={steps} currentStep={currentStep} />
        </Card>

        {/* Step Content */}
        <Card padding="lg">
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
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-900">Upload Your Document</h3>
                    <p className="text-sm text-slate-600 mt-1">Select the file you want to translate</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Supported Formats Info */}
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      Supported formats:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.values(SUPPORTED_FORMATS).map((format, idx) => (
                        <div key={idx} className="flex items-center text-sm text-slate-600">
                          <div className="h-1.5 w-1.5 bg-blue-400 rounded-full mr-2"></div>
                          {format.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Upload Dropzone */}
                  <UploadDropzone
                    onFileSelect={handleFileSelect}
                    acceptedFormats={Object.keys(SUPPORTED_FORMATS)}
                    maxSize={30 * 1024 * 1024}
                    file={file}
                  />

                  {/* File Preview */}
                  {file && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-emerald-50 border border-emerald-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <DocumentIcon className="w-8 h-8 text-emerald-600" />
                          <div>
                            <p className="text-sm font-semibold text-emerald-900">{file.name}</p>
                            <p className="text-xs text-emerald-700">
                              {(file.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Badge variant="success">Ready</Badge>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="flex justify-end mt-8">
                  <Button
                    onClick={proceedToNextStep}
                    disabled={!canProceedFromStep1}
                    icon={<ArrowRightIcon className="w-4 h-4" />}
                  >
                    Continue to Glossary
                  </Button>
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
                <div className="flex items-center mb-6">
                  <div className="p-2 bg-purple-100 rounded-lg mr-3">
                    <BookOpenIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-900">Select Glossary (Optional)</h3>
                    <p className="text-sm text-slate-600 mt-1">Choose a glossary to ensure consistent terminology</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Summary from previous step */}
                  {file && (
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <p className="text-xs font-medium text-slate-500 mb-1">Selected File</p>
                      <p className="text-sm text-slate-900 font-medium">{file.name}</p>
                    </div>
                  )}

                  {/* Glossary Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                      Available Glossaries
                    </label>
                    
                    {glossaries.length === 0 ? (
                      <EmptyState
                        icon={<BookOpenIcon className="w-12 h-12" />}
                        title="No glossaries available"
                        description="You can create a glossary to ensure consistent translations across your documents."
                      />
                    ) : (
                      <div className="space-y-3">
                        {/* No Glossary Option */}
                        <label className={`
                          flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all
                          ${selectedGlossary === '' 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                          }
                        `}>
                          <input
                            type="radio"
                            name="glossary"
                            value=""
                            checked={selectedGlossary === ''}
                            onChange={(e) => setSelectedGlossary(e.target.value)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="ml-3 flex-1">
                            <p className="text-sm font-medium text-slate-900">No Glossary</p>
                            <p className="text-xs text-slate-500">Translate without a glossary</p>
                          </div>
                        </label>

                        {/* Glossary Options */}
                        {glossaries.map((glossary) => (
                          <label
                            key={glossary.id}
                            className={`
                              flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all
                              ${selectedGlossary === glossary.id 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                              }
                            `}
                          >
                            <input
                              type="radio"
                              name="glossary"
                              value={glossary.id}
                              checked={selectedGlossary === glossary.id}
                              onChange={(e) => setSelectedGlossary(e.target.value)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="ml-3 flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-slate-900">{glossary.name}</p>
                                {glossary.hasLearningAI && (
                                  <Tooltip content="This glossary uses Learning AI Translation">
                                    <Badge variant="info" size="sm">🧠 AI Learning</Badge>
                                  </Tooltip>
                                )}
                              </div>
                              <div className="flex items-center space-x-4 mt-1">
                                <p className="text-xs text-slate-500">
                                  {glossary.sourceLanguage} → {glossary.targetLanguage}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {glossary.entriesCount} terms
                                </p>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <Button
                    variant="outline"
                    onClick={proceedToPreviousStep}
                    icon={<ArrowLeftIcon className="w-4 h-4" />}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={proceedToNextStep}
                    icon={<ArrowRightIcon className="w-4 h-4" />}
                  >
                    Continue to Languages
                  </Button>
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
                <div className="flex items-center mb-6">
                  <div className="p-2 bg-emerald-100 rounded-lg mr-3">
                    <LanguageIcon className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-900">Select Languages</h3>
                    <p className="text-sm text-slate-600 mt-1">Choose source and target languages for translation</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Summary from previous steps */}
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-2">
                    <p className="text-xs font-medium text-slate-500 mb-2">Translation Summary</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500">File</p>
                        <p className="text-sm text-slate-900 font-medium truncate">{file?.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Glossary</p>
                        <p className="text-sm text-slate-900 font-medium">
                          {selectedGlossary 
                            ? glossaries.find(g => g.id === selectedGlossary)?.name || 'Selected'
                            : 'None'
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Multi-language Toggle */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-blue-900">Multi-Language Translation</p>
                        <p className="text-xs text-blue-700 mt-1">
                          Translate to multiple languages simultaneously (recommended for enterprise)
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setIsMultiLanguage(!isMultiLanguage);
                          if (!isMultiLanguage) {
                            setTargetLanguage('');
                          } else {
                            setTargetLanguages([]);
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          isMultiLanguage ? 'bg-blue-600' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${
                            isMultiLanguage ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Language Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Source Language */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Source Language
                      </label>
                      <div className="space-y-2">
                        {LANGUAGES.map((lang) => (
                          <label
                            key={lang.code}
                            className={`
                              flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all
                              ${sourceLanguage === lang.code 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                              }
                            `}
                          >
                            <input
                              type="radio"
                              name="sourceLanguage"
                              value={lang.code}
                              checked={sourceLanguage === lang.code}
                              onChange={(e) => setSourceLanguage(e.target.value)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-3 text-lg">{lang.flag}</span>
                            <span className="ml-3 text-sm font-medium text-slate-900">{lang.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Target Language(s) */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        {isMultiLanguage ? 'Target Languages' : 'Target Language'}
                      </label>
                      {isMultiLanguage ? (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {LANGUAGES.filter(lang => lang.code !== sourceLanguage).map((lang) => (
                            <label
                              key={lang.code}
                              className={`
                                flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all
                                ${targetLanguages.includes(lang.code) 
                                  ? 'border-emerald-500 bg-emerald-50' 
                                  : 'border-slate-200 hover:border-slate-300 bg-white'
                                }
                              `}
                            >
                              <input
                                type="checkbox"
                                checked={targetLanguages.includes(lang.code)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setTargetLanguages([...targetLanguages, lang.code]);
                                  } else {
                                    setTargetLanguages(targetLanguages.filter(code => code !== lang.code));
                                  }
                                }}
                                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 rounded"
                              />
                              <span className="ml-3 text-lg">{lang.flag}</span>
                              <span className="ml-3 text-sm font-medium text-slate-900">{lang.name}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {LANGUAGES.filter(lang => lang.code !== sourceLanguage).map((lang) => (
                            <label
                              key={lang.code}
                              className={`
                                flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all
                                ${targetLanguage === lang.code 
                                  ? 'border-emerald-500 bg-emerald-50' 
                                  : 'border-slate-200 hover:border-slate-300 bg-white'
                                }
                              `}
                            >
                              <input
                                type="radio"
                                name="targetLanguage"
                                value={lang.code}
                                checked={targetLanguage === lang.code}
                                onChange={(e) => setTargetLanguage(e.target.value)}
                                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="ml-3 text-lg">{lang.flag}</span>
                              <span className="ml-3 text-sm font-medium text-slate-900">{lang.name}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Selected Languages Summary */}
                      {isMultiLanguage && targetLanguages.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200"
                        >
                          <p className="text-xs font-medium text-emerald-800 mb-1">
                            {targetLanguages.length} language{targetLanguages.length > 1 ? 's' : ''} selected
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {targetLanguages.map(code => {
                              const lang = LANGUAGES.find(l => l.code === code);
                              return (
                                <Badge key={code} variant="success" size="sm">
                                  {lang?.flag} {lang?.name}
                                </Badge>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Learning Stats Display */}
                  {learningStats && learningStats.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200"
                    >
                      <div className="flex items-center mb-3">
                        <SparklesIcon className="w-5 h-5 text-blue-600 mr-2" />
                        <h4 className="text-sm font-semibold text-blue-900">AI Learning Status</h4>
                      </div>
                      <div className="space-y-2">
                        {learningStats.map((item: any, index: number) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="text-blue-700">
                              {LANGUAGES.find(l => l.code === item.language)?.name || item.language}:
                            </span>
                            <span className="font-medium text-blue-900">
                              {item.stats ? (
                                <>
                                  {item.stats.termCount} terms, {item.stats.segmentCount} phrases
                                  {item.stats.totalUsage > 0 && (
                                    <span className="ml-2 text-blue-600">
                                      ({item.stats.totalUsage} corrections applied)
                                    </span>
                                  )}
                                </>
                              ) : (
                                'No previous learning'
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                      {learningStats.some((item: any) => item.stats && item.stats.totalUsage > 0) && (
                        <p className="text-xs text-blue-600 mt-3 flex items-center">
                          <SparklesIcon className="w-4 h-4 mr-1" />
                          This translation will automatically use learned corrections from previous feedback!
                        </p>
                      )}
                    </motion.div>
                  )}
                </div>

                <div className="flex justify-between mt-8">
                  <Button
                    variant="outline"
                    onClick={proceedToPreviousStep}
                    icon={<ArrowLeftIcon className="w-4 h-4" />}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleTranslate}
                    disabled={!canProceedFromStep3 || loading}
                    loading={loading}
                    icon={<SparklesIcon className="w-4 h-4" />}
                  >
                    {isMultiLanguage 
                      ? `Start Translation (${targetLanguages.length} languages)` 
                      : 'Start Translation'
                    }
                  </Button>
                </div>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 mb-4 shadow-lg"
                  >
                    {jobStatus === 'completed' ? (
                      <CheckCircleIcon className="w-12 h-12 text-white" />
                    ) : (
                      <ArrowPathIcon className="w-12 h-12 text-white animate-spin" />
                    )}
                  </motion.div>
                  <h3 className="text-2xl font-semibold text-slate-900 mb-2">
                    {jobStatus === 'completed' ? 'Translation Complete!' : 'Translation in Progress'}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {jobStatus === 'completed' 
                      ? 'Your document has been successfully translated'
                      : 'Please wait while we process your document'
                    }
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Translation Details */}
                  <Card padding="md">
                    <h4 className="text-lg font-semibold text-slate-900 mb-4">Translation Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">File</p>
                        <p className="text-sm text-slate-900 font-medium">{file?.name}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Translation</p>
                        <p className="text-sm text-slate-900 font-medium">
                          {sourceLanguage} → {isMultiLanguage 
                            ? `${targetLanguages.length} languages` 
                            : targetLanguage
                          }
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-xs font-medium text-slate-500 mb-2">Status</p>
                      <div className="flex items-center space-x-3">
                        <Badge 
                          variant={
                            jobStatus === 'completed' ? 'success' :
                            jobStatus === 'processing' ? 'warning' :
                            jobStatus === 'failed' ? 'error' : 'neutral'
                          }
                        >
                          {jobStatus === 'completed' && '✓ '}
                          {jobStatus === 'processing' && '⏳ '}
                          {jobStatus === 'failed' && '⚠ '}
                          {jobStatus?.toUpperCase() || 'PENDING'}
                        </Badge>
                        {jobStatus === 'processing' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={checkJobStatus}
                            icon={<ArrowPathIcon className="w-4 h-4" />}
                          >
                            Refresh
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Multi-language Progress */}
                    {isMultiLanguage && childJobs.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-slate-200">
                        <p className="text-sm font-medium text-slate-700 mb-3">Language Progress</p>
                        <div className="space-y-2">
                          {childJobs.map((childJob) => (
                            <div key={childJob.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <span className="text-sm font-medium text-slate-900">
                                  {LANGUAGES.find(l => l.code === childJob.targetLanguage)?.flag} {' '}
                                  {LANGUAGES.find(l => l.code === childJob.targetLanguage)?.name || childJob.targetLanguage}
                                </span>
                                <Badge 
                                  variant={
                                    childJob.status === 'completed' ? 'success' :
                                    childJob.status === 'processing' ? 'warning' :
                                    childJob.status === 'failed' ? 'error' : 'neutral'
                                  }
                                  size="sm"
                                >
                                  {childJob.status}
                                </Badge>
                                {childJob.status === 'completed' && childJob.appliedLearningCorrections > 0 && (
                                  <Tooltip content={`${childJob.appliedLearningCorrections} learned corrections applied`}>
                                    <Badge variant="info" size="sm">🧠 {childJob.appliedLearningCorrections}</Badge>
                                  </Tooltip>
                                )}
                              </div>
                              {childJob.status === 'completed' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => downloadLanguageResult(childJob.id)}
                                  icon={<ArrowDownTrayIcon className="w-4 h-4" />}
                                >
                                  Download
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    {jobStatus === 'completed' && (
                      <>
                        <Button
                          onClick={downloadResult}
                          icon={<ArrowDownTrayIcon className="w-4 h-4" />}
                          size="lg"
                        >
                          Download Translation
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => router.push(`/dashboard/jobs/${jobId}`)}
                          icon={<EyeIcon className="w-4 h-4" />}
                          size="lg"
                        >
                          View Details
                        </Button>
                      </>
                    )}
                    {jobStatus !== 'completed' && (
                      <Button
                        variant="outline"
                        onClick={checkJobStatus}
                        icon={<ArrowPathIcon className="w-4 h-4" />}
                        size="lg"
                      >
                        Check Status
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>
    </div>
  );
}
