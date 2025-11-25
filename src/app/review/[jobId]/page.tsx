"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  DocumentIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface Translation {
  id: string;
  sourceFileName: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: string;
  outputFilePath?: string;
}

interface Correction {
  id: string;
  originalText: string;
  correctedText: string;
  type: 'terminology' | 'phrasing';
}

const LANGUAGES = [
  { code: 'EN', name: 'English' },
  { code: 'DE', name: 'German' },
  { code: 'FR', name: 'French' },
  { code: 'NL', name: 'Dutch' },
  { code: 'ES', name: 'Spanish' },
  { code: 'IT', name: 'Italian' },
  { code: 'PT', name: 'Portuguese' },
];

export default function ReviewPage() {
  const params = useParams();
  const jobId = params.jobId as string;
  
  const [translation, setTranslation] = useState<Translation | null>(null);
  const [loading, setLoading] = useState(true);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [currentCorrection, setCurrentCorrection] = useState<string>('');
  const [editingText, setEditingText] = useState<string>('');
  const [correctionType, setCorrectionType] = useState<'terminology' | 'phrasing'>('terminology');
  const [countryCode, setCountryCode] = useState<string>('');
  const [submitterEmail, setSubmitterEmail] = useState<string>('');
  const [previousCorrections, setPreviousCorrections] = useState<any[]>([]);
  const [showPreviousCorrections, setShowPreviousCorrections] = useState<boolean>(false);

  useEffect(() => {
    fetchTranslation();
    fetchPreviousCorrections();
  }, [jobId]);

  const fetchTranslation = async () => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`);
      const data = await response.json();
      if (data.success) {
        setTranslation(data.job);
      }
    } catch (error) {
      console.error('Failed to fetch translation:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviousCorrections = async () => {
    try {
      const response = await fetch(`/api/corrections/${jobId}`);
      const data = await response.json();
      if (data.success) {
        setPreviousCorrections(data.corrections);
      }
    } catch (error) {
      console.error('Failed to fetch previous corrections:', error);
    }
  };

  const addCorrection = (originalText: string) => {
    setCurrentCorrection(originalText);
    setEditingText(originalText);
  };

  const saveCorrection = () => {
    if (currentCorrection && editingText && editingText !== currentCorrection) {
      const newCorrection: Correction = {
        id: Date.now().toString(),
        originalText: currentCorrection,
        correctedText: editingText,
        type: correctionType,
      };
      setCorrections([...corrections, newCorrection]);
      setCurrentCorrection('');
      setEditingText('');
    }
  };

  const removeCorrection = (correctionId: string) => {
    setCorrections(corrections.filter(c => c.id !== correctionId));
  };

  const submitCorrections = async () => {
    if (!countryCode || !submitterEmail || corrections.length === 0) {
      alert('Please fill in your country code, email, and add at least one correction.');
      return;
    }

    try {
      const response = await fetch('/api/corrections/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId,
          targetLanguage: translation?.targetLanguage,
          countryCode,
          submittedBy: submitterEmail,
          corrections: corrections.map(c => ({
            originalText: c.originalText,
            correctedText: c.correctedText,
            type: c.type,
          })),
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert('Corrections submitted successfully! Thank you for your feedback.');
        setCorrections([]);
      } else {
        alert('Failed to submit corrections. Please try again.');
      }
    } catch (error) {
      console.error('Failed to submit corrections:', error);
      alert('Failed to submit corrections. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading translation...</p>
        </div>
      </div>
    );
  }

  if (!translation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Translation Not Found</h2>
          <p className="text-slate-600">The requested translation could not be found.</p>
        </div>
      </div>
    );
  }

  const sourceLanguageName = LANGUAGES.find(l => l.code === translation.sourceLanguage)?.name || translation.sourceLanguage;
  const targetLanguageName = LANGUAGES.find(l => l.code === translation.targetLanguage)?.name || translation.targetLanguage;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-shrink-0 p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <DocumentIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Review Translation
              </h1>
              <p className="text-lg text-slate-600 mt-1">
                {translation.sourceFileName} • {sourceLanguageName} → {targetLanguageName}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Country Information Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6"
        >
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Reviewer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Country Code *
              </label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select your country</option>
                <option value="NL">Netherlands</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                <option value="ES">Spain</option>
                <option value="IT">Italy</option>
                <option value="PT">Portugal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={submitterEmail}
                onChange={(e) => setSubmitterEmail(e.target.value)}
                placeholder="your.email@company.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </motion.div>

        {/* Document Review Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6"
        >
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Document Review</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Source Document */}
            <div>
              <h3 className="text-md font-medium text-slate-700 mb-3">
                Original ({sourceLanguageName})
              </h3>
              <div className="bg-slate-50 rounded-lg p-4 h-96 overflow-y-auto border">
                <div className="space-y-4">
                  {/* Sample content - in real implementation, you'd load the actual document content */}
                  <p className="text-slate-700 leading-relaxed cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors">
                    Welcome to Quooker, the revolutionary kitchen tap that provides boiling water instantly.
                  </p>
                  <p className="text-slate-700 leading-relaxed cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors">
                    Our products are designed with safety and convenience in mind.
                  </p>
                  <p className="text-slate-700 leading-relaxed cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors">
                    Installation is simple and can be completed by any qualified plumber.
                  </p>
                </div>
              </div>
            </div>

            {/* Translated Document */}
            <div>
              <h3 className="text-md font-medium text-slate-700 mb-3">
                Translation ({targetLanguageName})
              </h3>
              <div className="bg-slate-50 rounded-lg p-4 h-96 overflow-y-auto border">
                <div className="space-y-4">
                  {/* Sample translated content - click to edit */}
                  <p 
                    className="text-slate-700 leading-relaxed cursor-pointer hover:bg-yellow-50 p-2 rounded transition-colors border-l-4 border-transparent hover:border-yellow-400"
                    onClick={() => addCorrection("Willkommen bei Quooker, dem revolutionären Küchenarmatur, der sofort kochendes Wasser liefert.")}
                  >
                    Willkommen bei Quooker, dem revolutionären Küchenarmatur, der sofort kochendes Wasser liefert.
                  </p>
                  <p 
                    className="text-slate-700 leading-relaxed cursor-pointer hover:bg-yellow-50 p-2 rounded transition-colors border-l-4 border-transparent hover:border-yellow-400"
                    onClick={() => addCorrection("Unsere Produkte sind mit Sicherheit und Komfort im Sinn entworfen.")}
                  >
                    Unsere Produkte sind mit Sicherheit und Komfort im Sinn entworfen.
                  </p>
                  <p 
                    className="text-slate-700 leading-relaxed cursor-pointer hover:bg-yellow-50 p-2 rounded transition-colors border-l-4 border-transparent hover:border-yellow-400"
                    onClick={() => addCorrection("Installation ist einfach und kann von jedem qualifizierten Klempner abgeschlossen werden.")}
                  >
                    Installation ist einfach und kann von jedem qualifizierten Klempner abgeschlossen werden.
                  </p>
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-2">
                💡 Click any text above to suggest corrections
              </p>
            </div>
          </div>
        </motion.div>

        {/* Correction Editor */}
        {currentCorrection && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-lg border border-blue-200 p-6 mb-6"
          >
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
              <PencilSquareIcon className="h-5 w-5 mr-2 text-blue-600" />
              Edit Translation
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Original Text:</label>
                <div className="bg-slate-100 rounded-lg p-3 text-slate-800">
                  {currentCorrection}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Your Correction:</label>
                <textarea
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your corrected translation..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Correction Type:</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="terminology"
                      checked={correctionType === 'terminology'}
                      onChange={(e) => setCorrectionType(e.target.value as 'terminology')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-slate-700">Terminology (wrong term used)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="phrasing"
                      checked={correctionType === 'phrasing'}
                      onChange={(e) => setCorrectionType(e.target.value as 'phrasing')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-slate-700">Phrasing (awkward wording)</span>
                  </label>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={saveCorrection}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Correction
                </button>
                <button
                  onClick={() => {
                    setCurrentCorrection('');
                    setEditingText('');
                  }}
                  className="bg-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Previous Corrections */}
        {previousCorrections.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Previous Corrections ({previousCorrections.length})</h3>
              <button
                onClick={() => setShowPreviousCorrections(!showPreviousCorrections)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                {showPreviousCorrections ? 'Hide' : 'Show'} Previous Corrections
              </button>
            </div>
            
            {showPreviousCorrections && (
              <div className="space-y-3">
                {previousCorrections.map((correction, index) => (
                  <div key={correction.id} className="bg-slate-50 rounded-lg p-4 border-l-4 border-blue-200">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-slate-700">
                          {correction.countryCode}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          correction.correctionType === 'terminology' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {correction.correctionType}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(correction.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-medium text-slate-600 mb-1">Original:</p>
                        <p className="text-sm text-slate-800 bg-red-50 p-2 rounded border-l-2 border-red-300">
                          {correction.originalText}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-600 mb-1">Corrected:</p>
                        <p className="text-sm text-slate-800 bg-green-50 p-2 rounded border-l-2 border-green-300">
                          {correction.correctedText}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Current Corrections */}
        {corrections.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6"
          >
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Your New Corrections ({corrections.length})</h3>
            <div className="space-y-3">
              {corrections.map((correction, index) => (
                <div key={correction.id} className="bg-slate-50 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-1">Original:</p>
                          <p className="text-sm text-slate-800 bg-red-50 p-2 rounded border-l-4 border-red-300">
                            {correction.originalText}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-600 mb-1">Corrected:</p>
                          <p className="text-sm text-slate-800 bg-green-50 p-2 rounded border-l-4 border-green-300">
                            {correction.correctedText}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          correction.type === 'terminology' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {correction.type}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeCorrection(correction.id)}
                      className="ml-4 text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Submit Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center"
        >
          <button
            onClick={submitCorrections}
            disabled={corrections.length === 0 || !countryCode || !submitterEmail}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-3 rounded-lg hover:from-emerald-700 hover:to-teal-700 font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircleIcon className="h-5 w-5" />
            <span>Submit Corrections ({corrections.length})</span>
          </button>
        </motion.div>
      </div>
    </div>
  );
}