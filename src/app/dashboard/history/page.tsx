"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownTrayIcon,
  EyeIcon,
  PencilSquareIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import Tooltip from '@/components/ui/Tooltip';

interface TranslationJob {
  id: string;
  sourceFileName: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  glossaryId?: string;
  qaScore?: number;
  appliedLearningCorrections?: number;
  learningStatsUsed?: {
    termCount: number;
    segmentCount: number;
    totalUsage: number;
  };
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
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs');
      const data = await response.json();
      if (data.success) {
        setJobs(data.jobs || []);
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
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'processing':
        return <Badge variant="warning">Processing</Badge>;
      case 'failed':
        return <Badge variant="error">Failed</Badge>;
      case 'pending':
        return <Badge variant="info">Pending</Badge>;
      default:
        return <Badge variant="neutral">Unknown</Badge>;
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

  const LANGUAGES = [
    { code: 'EN', name: 'English' },
    { code: 'DE', name: 'German' },
    { code: 'FR', name: 'French' },
    { code: 'NL', name: 'Dutch' },
    { code: 'ES', name: 'Spanish' },
    { code: 'IT', name: 'Italian' },
    { code: 'PT', name: 'Portuguese' },
  ];

  const filteredJobs = jobs.filter(job => {
    // Search filter
    if (searchQuery && !job.sourceFileName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Other filters
    if (filters.sourceLanguage && job.sourceLanguage !== filters.sourceLanguage) return false;
    if (filters.targetLanguage && job.targetLanguage !== filters.targetLanguage) return false;
    if (filters.status && job.status !== filters.status) return false;
    if (filters.dateFrom && new Date(job.createdAt) < new Date(filters.dateFrom)) return false;
    if (filters.dateTo && new Date(job.createdAt) > new Date(filters.dateTo)) return false;
    return true;
  });

  const activeFiltersCount = Object.values(filters).filter(v => v !== '').length;

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Translation History</h1>
            <p className="text-slate-600 mt-2">
              View and manage all your completed translations
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by file name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            icon={<FunnelIcon className="w-4 h-4" />}
          >
            Filters
            {activeFiltersCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4"
          >
            <Card padding="md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Filter Options</h3>
                <button
                  onClick={() => {
                    setFilters({
                      sourceLanguage: '',
                      targetLanguage: '',
                      status: '',
                      dateFrom: '',
                      dateTo: '',
                    });
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear All
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Source Language
                  </label>
                  <select
                    value={filters.sourceLanguage}
                    onChange={(e) => setFilters({...filters, sourceLanguage: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    {LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Target Language
                  </label>
                  <select
                    value={filters.targetLanguage}
                    onChange={(e) => setFilters({...filters, targetLanguage: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    {LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    <option value="completed">Completed</option>
                    <option value="processing">Processing</option>
                    <option value="failed">Failed</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Date From
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">
                    Date To
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Jobs Table */}
      {loading ? (
        <Card padding="lg">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-32" />
                <Skeleton className="h-12 flex-1" />
                <Skeleton className="h-12 w-24" />
                <Skeleton className="h-12 w-24" />
              </div>
            ))}
          </div>
        </Card>
      ) : filteredJobs.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<EyeIcon className="w-16 h-16" />}
            title={jobs.length === 0 ? "No translations yet" : "No jobs match your filters"}
            description={
              jobs.length === 0
                ? "Start translating documents to see them appear here"
                : "Try adjusting your search or filter criteria"
            }
          />
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Languages
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Quality
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    AI Learning
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredJobs.map((job) => (
                  <motion.tr
                    key={job.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{formatDate(job.createdAt)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-slate-900 max-w-xs truncate">
                        {job.sourceFileName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">
                        {job.sourceLanguage} → {job.targetLanguage}
                      </div>
                      {job.glossaryId && (
                        <div className="text-xs text-slate-500 mt-1">With glossary</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(job.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {job.status === 'completed' && job.qaScore !== undefined ? (
                        <Tooltip content={`Quality score: ${job.qaScore}/100`}>
                          <Badge
                            variant={
                              job.qaScore >= 90 ? 'success' :
                              job.qaScore >= 70 ? 'warning' : 'error'
                            }
                          >
                            {job.qaScore}/100
                          </Badge>
                        </Tooltip>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {job.status === 'completed' && job.appliedLearningCorrections !== undefined ? (
                        job.appliedLearningCorrections > 0 ? (
                          <Tooltip
                            content={
                              job.learningStatsUsed
                                ? `${job.learningStatsUsed.termCount} terms, ${job.learningStatsUsed.segmentCount} phrases used`
                                : `${job.appliedLearningCorrections} corrections applied`
                            }
                          >
                            <Badge variant="info">
                              🧠 {job.appliedLearningCorrections}
                            </Badge>
                          </Tooltip>
                        ) : (
                          <span className="text-xs text-slate-400">None</span>
                        )
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-3">
                        {job.status === 'completed' && (
                          <>
                            <Link
                              href={`/dashboard/jobs/${job.id}`}
                              className="text-blue-600 hover:text-blue-700 transition-colors"
                            >
                              <Tooltip content="View details">
                                <EyeIcon className="w-5 h-5" />
                              </Tooltip>
                            </Link>
                            <button
                              onClick={() => downloadFile(job.id)}
                              className="text-blue-600 hover:text-blue-700 transition-colors"
                            >
                              <Tooltip content="Download">
                                <ArrowDownTrayIcon className="w-5 h-5" />
                              </Tooltip>
                            </button>
                            <Link
                              href={`/review/${job.id}`}
                              className="text-emerald-600 hover:text-emerald-700 transition-colors"
                            >
                              <Tooltip content="Review & correct">
                                <PencilSquareIcon className="w-5 h-5" />
                              </Tooltip>
                            </Link>
                          </>
                        )}
                        {job.status !== 'completed' && (
                          <span className="text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
