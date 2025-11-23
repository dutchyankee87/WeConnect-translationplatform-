"use client";

import { useState, useEffect } from 'react';
import { ArrowDownTrayIcon, EyeIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface TranslationJob {
  id: string;
  sourceFileName: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  glossaryId?: string;
  qaScore?: number;
}

export default function TranslationHistoryPage() {
  const [jobs, setJobs] = useState<TranslationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    sourceLanguage: '',
    targetLanguage: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs');
      const data = await response.json();
      if (data.success) {
        setJobs(data.jobs);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        // Get filename from response headers if available
        const contentDisposition = response.headers.get('content-disposition');
        const filename = contentDisposition
          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
          : 'translated-document';
        a.download = filename || 'translated-document';
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
    const baseClasses = "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredJobs = jobs.filter(job => {
    if (filters.sourceLanguage && job.sourceLanguage !== filters.sourceLanguage) return false;
    if (filters.targetLanguage && job.targetLanguage !== filters.targetLanguage) return false;
    if (filters.status && job.status !== filters.status) return false;
    if (filters.dateFrom && new Date(job.createdAt) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(job.createdAt) > new Date(filters.dateTo)) return false;
    return true;
  });

  const LANGUAGES = [
    { code: 'EN', name: 'English' },
    { code: 'DE', name: 'German' },
    { code: 'FR', name: 'French' },
    { code: 'NL', name: 'Dutch' },
    { code: 'ES', name: 'Spanish' },
    { code: 'IT', name: 'Italian' },
    { code: 'PT', name: 'Portuguese' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading translation history...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Translation History</h1>
        <p className="mt-1 text-sm text-gray-600">
          View and download your completed translations.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Source Language
            </label>
            <select
              value={filters.sourceLanguage}
              onChange={(e) => setFilters({...filters, sourceLanguage: e.target.value})}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All</option>
              {LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Target Language
            </label>
            <select
              value={filters.targetLanguage}
              onChange={(e) => setFilters({...filters, targetLanguage: e.target.value})}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All</option>
              {LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Date From
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Date To
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-white shadow overflow-hidden rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                File Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Languages
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Glossary
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                QA Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredJobs.map((job) => (
              <tr key={job.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{formatDate(job.createdAt)}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                    {job.sourceFileName}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {job.sourceLanguage} → {job.targetLanguage}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {job.glossaryId ? 'Yes' : 'None'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={getStatusBadge(job.status)}>
                    {job.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {job.status === 'completed' && job.qaScore !== undefined ? (
                    <div className="flex items-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        job.qaScore >= 90 ? 'bg-green-100 text-green-800' :
                        job.qaScore >= 70 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {job.qaScore}/100
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    {job.status === 'completed' && (
                      <Link
                        href={`/dashboard/jobs/${job.id}`}
                        className="inline-flex items-center text-indigo-600 hover:text-indigo-900"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View Details
                      </Link>
                    )}
                    {job.status === 'completed' && (
                      <button
                        onClick={() => downloadFile(job.id)}
                        className="inline-flex items-center text-indigo-600 hover:text-indigo-900"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                        Download
                      </button>
                    )}
                    {job.status !== 'completed' && (
                      <span className="text-gray-400">—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredJobs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              {jobs.length === 0 ? 'No translation jobs found.' : 'No jobs match your filters.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}