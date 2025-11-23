"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import QAResults from '@/components/QAResults';
import { ArrowDownTrayIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface JobDetails {
  id: string;
  sourceFileName: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  glossaryId?: string;
}

interface QAData {
  qualityScore: number;
  glossaryWarnings: Array<{
    segment: string;
    sourceTerm: string;
    targetTerm: string;
    message: string;
    segmentIndex: number;
  }>;
  numberWarnings: Array<{
    segment: string;
    sourceNumbers: string[];
    targetNumbers: string[];
    message: string;
    segmentIndex: number;
  }>;
}

export default function JobDetailsPage() {
  const params = useParams();
  const [job, setJob] = useState<JobDetails | null>(null);
  const [qa, setQA] = useState<QAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (params.id) {
      fetchJobDetails(params.id as string);
    }
  }, [params.id]);

  const fetchJobDetails = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`);
      const data = await response.json();
      
      if (data.success) {
        setJob(data.job);
        setQA(data.qa);
      } else {
        setError(data.error || 'Failed to fetch job details');
      }
    } catch (error) {
      console.error('Failed to fetch job details:', error);
      setError('Failed to fetch job details');
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async () => {
    if (!job) return;
    
    try {
      const response = await fetch(`/api/jobs/${job.id}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const contentDisposition = response.headers.get('content-disposition');
        const filename = contentDisposition
          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
          : `translated_${job.sourceFileName}`;
        a.download = filename || `translated_${job.sourceFileName}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download file');
      }
    } catch (error) {
      alert('Error downloading file');
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-3 py-1 rounded-full text-sm font-medium";
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'processing':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'pending':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading job details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800">{error}</div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-4xl">
        <div className="text-center py-8">
          <div className="text-gray-500">Job not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link 
          href="/dashboard/history"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Translation History
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Translation Job Details</h1>
            <p className="mt-1 text-sm text-gray-600">
              View detailed information and quality assessment for this translation.
            </p>
          </div>
          {job.status === 'completed' && (
            <button
              onClick={downloadFile}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Download Result
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Job Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Job Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">File Name</dt>
              <dd className="text-sm text-gray-900 mt-1">{job.sourceFileName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1">
                <span className={getStatusBadge(job.status)}>
                  {job.status.toUpperCase()}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Languages</dt>
              <dd className="text-sm text-gray-900 mt-1">
                {job.sourceLanguage} → {job.targetLanguage}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Glossary</dt>
              <dd className="text-sm text-gray-900 mt-1">
                {job.glossaryId ? 'Used' : 'None'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="text-sm text-gray-900 mt-1">
                {formatDate(job.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
              <dd className="text-sm text-gray-900 mt-1">
                {formatDate(job.updatedAt)}
              </dd>
            </div>
          </div>
        </div>

        {/* QA Results */}
        {qa && job.status === 'completed' && (
          <QAResults
            qualityScore={qa.qualityScore}
            glossaryWarnings={qa.glossaryWarnings || []}
            numberWarnings={qa.numberWarnings || []}
          />
        )}

        {/* No QA Results */}
        {!qa && job.status === 'completed' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quality Assurance</h3>
            <div className="text-center py-8">
              <div className="text-gray-500">No QA results available for this job.</div>
            </div>
          </div>
        )}

        {/* Job Still Processing */}
        {job.status !== 'completed' && job.status !== 'failed' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-blue-800">
                  Translation in Progress
                </h3>
                <p className="text-blue-700">
                  QA results will be available once the translation is complete.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Job Failed */}
        {job.status === 'failed' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-red-800 mb-2">Translation Failed</h3>
            <p className="text-red-700">
              This translation job encountered an error and could not be completed. 
              Please try uploading the file again or contact support if the issue persists.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}