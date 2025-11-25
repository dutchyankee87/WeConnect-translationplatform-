"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon,
  DocumentArrowUpIcon,
  BookOpenIcon,
  SparklesIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';
import Tooltip from '@/components/ui/Tooltip';

interface Glossary {
  id: string;
  name: string;
  entriesCount: number;
  sourceLanguage: string;
  targetLanguage: string;
  status: 'ready' | 'syncing' | 'error';
  createdAt: string;
  hasLearningAI?: boolean;
}

export default function GlossariesPage() {
  const [glossaries, setGlossaries] = useState<Glossary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showOneDriveModal, setShowOneDriveModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchGlossaries();
  }, []);

  const fetchGlossaries = async () => {
    try {
      const response = await fetch('/api/glossaries');
      const data = await response.json();
      if (data.success) {
        setGlossaries(data.glossaries || []);
      }
    } catch (error) {
      console.error('Failed to fetch glossaries:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGlossaries = glossaries.filter(glossary =>
    glossary.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    glossary.sourceLanguage.toLowerCase().includes(searchQuery.toLowerCase()) ||
    glossary.targetLanguage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge variant="success">Ready</Badge>;
      case 'syncing':
        return <Badge variant="warning">Syncing</Badge>;
      case 'error':
        return <Badge variant="error">Error</Badge>;
      default:
        return <Badge variant="neutral">Unknown</Badge>;
    }
  };

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Glossaries</h1>
            <p className="text-slate-600 mt-2">
              Manage translation glossaries to ensure consistent terminology across all documents
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowOneDriveModal(true)}
              icon={<DocumentArrowUpIcon className="w-4 h-4" />}
            >
              OneDrive Import
            </Button>
            <Button
              onClick={() => setShowCreateModal(true)}
              icon={<PlusIcon className="w-4 h-4" />}
            >
              New Glossary
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search glossaries by name or language..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
        </div>
      </div>

      {/* Glossaries Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} padding="md">
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-1/3" />
            </Card>
          ))}
        </div>
      ) : filteredGlossaries.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<BookOpenIcon className="w-16 h-16" />}
            title={searchQuery ? "No glossaries found" : "No glossaries yet"}
            description={
              searchQuery
                ? "Try adjusting your search query"
                : "Create your first glossary to ensure consistent translations across your documents"
            }
            action={
              !searchQuery && (
                <Button onClick={() => setShowCreateModal(true)} icon={<PlusIcon className="w-4 h-4" />}>
                  Create Glossary
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredGlossaries.map((glossary, index) => (
              <motion.div
                key={glossary.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card hover padding="md" className="h-full flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-slate-900 truncate mb-1">
                        {glossary.name}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <Badge variant="info" size="sm">
                          {glossary.sourceLanguage} → {glossary.targetLanguage}
                        </Badge>
                        {glossary.hasLearningAI && (
                          <Tooltip content="This glossary uses Learning AI Translation">
                            <Badge variant="info" size="sm">🧠 AI</Badge>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Entries</span>
                      <span className="font-semibold text-slate-900">{glossary.entriesCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Status</span>
                      {getStatusBadge(glossary.status)}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Created</span>
                      <span className="text-slate-500">
                        {new Date(glossary.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Future: Add action buttons */}
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <Button variant="ghost" size="sm" fullWidth>
                      View Details
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Glossary Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateGlossaryModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={fetchGlossaries}
          />
        )}
      </AnimatePresence>

      {/* OneDrive Modal */}
      <AnimatePresence>
        {showOneDriveModal && (
          <OneDriveModal
            onClose={() => setShowOneDriveModal(false)}
            onSuccess={fetchGlossaries}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateGlossaryModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [entriesText, setEntriesText] = useState('');
  const [loading, setLoading] = useState(false);

  const LANGUAGES = [
    { code: 'EN', name: 'English' },
    { code: 'DE', name: 'German' },
    { code: 'FR', name: 'French' },
    { code: 'NL', name: 'Dutch' },
    { code: 'ES', name: 'Spanish' },
    { code: 'IT', name: 'Italian' },
    { code: 'PT', name: 'Portuguese' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const entries = entriesText
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [source, target] = line.split(',').map(s => s.trim());
          return { source: source || '', target: target || '' };
        })
        .filter(entry => entry.source && entry.target);

      const response = await fetch('/api/glossaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          sourceLanguage,
          targetLanguage,
          entries,
        }),
      });

      const data = await response.json();
      if (data.success) {
        onSuccess();
        onClose();
      } else {
        alert('Failed to create glossary');
      }
    } catch (error) {
      alert('An error occurred while creating the glossary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpenIcon className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">Create New Glossary</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Glossary Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Technical Terms"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Source Language
              </label>
              <select
                required
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select</option>
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Target Language
              </label>
              <select
                required
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select</option>
                {LANGUAGES.filter(lang => lang.code !== sourceLanguage).map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Entries (one per line, comma-separated)
            </label>
            <textarea
              required
              rows={6}
              value={entriesText}
              onChange={(e) => setEntriesText(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="source term, target term&#10;example, Beispiel&#10;technology, Technologie"
            />
            <p className="text-xs text-slate-500 mt-2">
              Format: source term, target term (one pair per line)
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              loading={loading}
            >
              Create Glossary
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function OneDriveModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [currentFolder, setCurrentFolder] = useState('root');
  const [folderPath, setFolderPath] = useState([{ id: 'root', name: 'OneDrive' }]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [importing, setImporting] = useState(false);

  const handleAuthenticate = async () => {
    setIsAuthenticating(true);
    try {
      const response = await fetch('/api/auth/microsoft/login');
      const data = await response.json();
      
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Authentication error:', error);
      alert('Failed to authenticate with Microsoft');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const loadFiles = async (folderId: string = 'root') => {
    if (!accessToken) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/onedrive/files?access_token=${accessToken}&folder_id=${folderId}`);
      const data = await response.json();
      
      if (data.success) {
        setFiles(data.files);
        setCurrentFolder(folderId);
      } else {
        alert('Failed to load files from OneDrive');
      }
    } catch (error) {
      console.error('Error loading files:', error);
      alert('Error loading files from OneDrive');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file: any) => {
    if (file.isFolder) {
      setFolderPath([...folderPath, { id: file.id, name: file.name }]);
      loadFiles(file.id);
    } else {
      setSelectedFile(file);
    }
  };

  const navigateUp = () => {
    if (folderPath.length > 1) {
      const newPath = folderPath.slice(0, -1);
      setFolderPath(newPath);
      const parentId = newPath[newPath.length - 1].id;
      loadFiles(parentId);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !accessToken) return;

    setImporting(true);
    try {
      const response = await fetch('/api/onedrive/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken,
          fileId: selectedFile.id,
          fileName: selectedFile.name
        })
      });

      const data = await response.json();
      
      if (data.success && data.entries?.length > 0) {
        // Create glossary with imported entries
        const glossaryResponse = await fetch('/api/glossaries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: selectedFile.name.replace(/\.[^/.]+$/, ""), // Remove file extension
            sourceLanguage: 'EN',
            targetLanguage: 'DE',
            entries: data.entries
          })
        });

        const glossaryData = await glossaryResponse.json();
        if (glossaryData.success) {
          onSuccess();
          onClose();
          alert(`Successfully imported ${data.entries.length} entries from ${selectedFile.name}`);
        } else {
          alert('Failed to create glossary from imported data');
        }
      } else {
        alert(data.error || 'No valid entries found in the selected file');
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Error importing file from OneDrive');
    } finally {
      setImporting(false);
    }
  };

  // Check for auth success in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('access_token');
    if (token) {
      setAccessToken(token);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Load files when token is available
  useEffect(() => {
    if (accessToken) {
      loadFiles();
    }
  }, [accessToken]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
      >
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-slate-900">OneDrive Glossary Import</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 p-6 overflow-hidden">
          {!accessToken ? (
            <div className="text-center py-8">
              <DocumentArrowUpIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-4 font-medium">
                Connect to OneDrive
              </p>
              <p className="text-sm text-slate-500 mb-6">
                Sign in to your Microsoft account to browse and import glossary files.
              </p>
              <Button
                onClick={handleAuthenticate}
                loading={isAuthenticating}
                disabled={isAuthenticating}
              >
                {isAuthenticating ? 'Connecting...' : 'Connect to OneDrive'}
              </Button>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Breadcrumb */}
              <div className="mb-4">
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  {folderPath.map((folder, index) => (
                    <div key={folder.id} className="flex items-center">
                      {index > 0 && <span className="mx-2">/</span>}
                      <button
                        onClick={() => {
                          if (index < folderPath.length - 1) {
                            const newPath = folderPath.slice(0, index + 1);
                            setFolderPath(newPath);
                            loadFiles(folder.id);
                          }
                        }}
                        className="hover:text-slate-900"
                        disabled={index === folderPath.length - 1}
                      >
                        {folder.name}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* File List */}
              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading files...</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {folderPath.length > 1 && (
                      <button
                        onClick={navigateUp}
                        className="w-full p-3 text-left hover:bg-slate-50 flex items-center space-x-3"
                      >
                        <div className="w-6 h-6 text-slate-400">↑</div>
                        <span className="text-slate-600">.. (Go up)</span>
                      </button>
                    )}
                    {files.map((file) => (
                      <button
                        key={file.id}
                        onClick={() => handleFileSelect(file)}
                        className={`w-full p-3 text-left hover:bg-slate-50 flex items-center space-x-3 ${
                          selectedFile?.id === file.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                        }`}
                      >
                        <div className="w-6 h-6">
                          {file.isFolder ? (
                            <div className="w-5 h-4 bg-blue-100 rounded border border-blue-200"></div>
                          ) : (
                            <div className="w-4 h-5 bg-slate-100 rounded border border-slate-200"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium text-slate-900">{file.name}</div>
                          {!file.isFolder && (
                            <div className="text-xs text-slate-500">
                              {(file.size / 1024).toFixed(1)} KB
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                    {files.length === 0 && (
                      <div className="p-8 text-center text-slate-500">
                        No supported files found in this folder
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected File Info */}
              {selectedFile && !selectedFile.isFolder && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-900">Selected: {selectedFile.name}</p>
                  <p className="text-xs text-slate-500">
                    This file will be imported as a glossary. Supported formats: CSV, TXT with comma-separated values.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200">
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {accessToken && selectedFile && !selectedFile.isFolder && (
              <Button
                onClick={handleImport}
                loading={importing}
                disabled={importing}
              >
                {importing ? 'Importing...' : 'Import Glossary'}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
