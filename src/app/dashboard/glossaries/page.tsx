"use client";

import { useState, useEffect } from 'react';
import { PlusIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';

interface Glossary {
  id: string;
  name: string;
  entriesCount: number;
  sourceLanguage: string;
  targetLanguage: string;
  status: 'ready' | 'syncing' | 'error';
  createdAt: string;
}

export default function GlossariesPage() {
  const [glossaries, setGlossaries] = useState<Glossary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showOneDriveModal, setShowOneDriveModal] = useState(false);

  useEffect(() => {
    fetchGlossaries();
  }, []);

  const fetchGlossaries = async () => {
    try {
      const response = await fetch('/api/glossaries');
      const data = await response.json();
      if (data.success) {
        setGlossaries(data.glossaries);
      }
    } catch (error) {
      console.error('Failed to fetch glossaries:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";
    switch (status) {
      case 'ready':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'syncing':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'error':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading glossaries...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Glossary List</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage translation glossaries to ensure consistent terminology.
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowOneDriveModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
            + OneDrive New Glossary
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            + New Glossary
          </button>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Entries
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source Language
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Target Language
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {glossaries.map((glossary) => (
              <tr key={glossary.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{glossary.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{glossary.entriesCount}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{glossary.sourceLanguage}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{glossary.targetLanguage}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={getStatusBadge(glossary.status)}>
                    {glossary.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {glossaries.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">No glossaries found. Create your first glossary to get started.</div>
          </div>
        )}
      </div>

      {/* Create Glossary Modal */}
      {showCreateModal && (
        <CreateGlossaryModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchGlossaries}
        />
      )}

      {/* OneDrive Modal (Stub) */}
      {showOneDriveModal && (
        <OneDriveModal
          onClose={() => setShowOneDriveModal(false)}
          onSuccess={fetchGlossaries}
        />
      )}
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
      // Parse entries from text
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Glossary</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Glossary Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., Technical Terms"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source Language
              </label>
              <select
                required
                value={sourceLanguage}
                onChange={(e) => setSourceLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select</option>
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Language
              </label>
              <select
                required
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select</option>
                {LANGUAGES.filter(lang => lang.code !== sourceLanguage).map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entries (one per line, comma-separated)
            </label>
            <textarea
              required
              rows={6}
              value={entriesText}
              onChange={(e) => setEntriesText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="source term, target term&#10;example, Beispiel&#10;technology, Technologie"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Glossary'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OneDriveModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">OneDrive Glossary Import</h3>
        
        <div className="text-center py-8">
          <DocumentArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">
            OneDrive integration is not yet implemented. This is a placeholder for future functionality.
          </p>
          <p className="text-sm text-gray-400">
            This would allow you to select glossary files directly from your OneDrive account.
          </p>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}