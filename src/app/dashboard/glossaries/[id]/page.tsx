"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';

interface GlossaryEntry {
  id: string;
  source: string;
  target: string;
}

interface Glossary {
  id: string;
  name: string;
  entriesCount: number;
  sourceLanguage: string;
  targetLanguage: string;
  status: 'ready' | 'syncing' | 'error';
  createdAt: string;
  updatedAt: string;
  entries: GlossaryEntry[];
}

export default function GlossaryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [glossary, setGlossary] = useState<Glossary | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit state
  const [editName, setEditName] = useState('');
  const [editSourceLanguage, setEditSourceLanguage] = useState('');
  const [editTargetLanguage, setEditTargetLanguage] = useState('');
  const [editEntries, setEditEntries] = useState<GlossaryEntry[]>([]);

  const LANGUAGES = [
    { code: 'EN', name: 'English' },
    { code: 'DE', name: 'German' },
    { code: 'FR', name: 'French' },
    { code: 'NL', name: 'Dutch' },
    { code: 'ES', name: 'Spanish' },
    { code: 'IT', name: 'Italian' },
    { code: 'PT', name: 'Portuguese' },
  ];

  useEffect(() => {
    fetchGlossary();
  }, [params.id]);

  const fetchGlossary = async () => {
    try {
      const response = await fetch(`/api/glossaries/${params.id}`);
      const data = await response.json();
      if (data.success) {
        setGlossary(data.glossary);
        setEditName(data.glossary.name);
        setEditSourceLanguage(data.glossary.sourceLanguage);
        setEditTargetLanguage(data.glossary.targetLanguage);
        setEditEntries(data.glossary.entries || []);
      } else {
        router.push('/dashboard/glossaries');
      }
    } catch (error) {
      console.error('Failed to fetch glossary:', error);
      router.push('/dashboard/glossaries');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    if (!glossary) return;
    setEditing(false);
    setEditName(glossary.name);
    setEditSourceLanguage(glossary.sourceLanguage);
    setEditTargetLanguage(glossary.targetLanguage);
    setEditEntries(glossary.entries || []);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/glossaries/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          sourceLanguage: editSourceLanguage,
          targetLanguage: editTargetLanguage,
          entries: editEntries.map(entry => ({
            source: entry.source,
            target: entry.target,
          })),
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchGlossary();
        setEditing(false);
        if (data.warning) {
          alert(data.warning);
        }
      } else {
        alert('Failed to update glossary');
      }
    } catch (error) {
      alert('An error occurred while updating the glossary');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this glossary? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/glossaries?id=${params.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        router.push('/dashboard/glossaries');
      } else {
        alert('Failed to delete glossary');
      }
    } catch (error) {
      alert('An error occurred while deleting the glossary');
    } finally {
      setDeleting(false);
    }
  };

  const addEntry = () => {
    setEditEntries([...editEntries, { id: crypto.randomUUID(), source: '', target: '' }]);
  };

  const updateEntry = (id: string, field: 'source' | 'target', value: string) => {
    setEditEntries(editEntries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const removeEntry = (id: string) => {
    setEditEntries(editEntries.filter(entry => entry.id !== id));
  };

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

  if (loading) {
    return (
      <div className="max-w-4xl">
        <div className="mb-6">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-10 w-64" />
        </div>
        <Card padding="lg">
          <Skeleton className="h-6 w-48 mb-4" />
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-4 w-40" />
        </Card>
      </div>
    );
  }

  if (!glossary) {
    return null;
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/glossaries')}
          icon={<ArrowLeftIcon className="w-4 h-4" />}
          className="mb-4"
        >
          Back to Glossaries
        </Button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {editing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-3xl font-bold bg-transparent border-none outline-none focus:bg-white focus:border focus:border-slate-300 focus:rounded-lg focus:px-3 focus:py-1"
                  placeholder="Glossary name"
                />
              ) : (
                glossary.name
              )}
            </h1>
            <div className="flex items-center space-x-4 text-sm text-slate-600">
              <span>Created: {new Date(glossary.createdAt).toLocaleDateString()}</span>
              <span>Updated: {new Date(glossary.updatedAt).toLocaleDateString()}</span>
              {getStatusBadge(glossary.status)}
            </div>
          </div>
          
          <div className="flex space-x-3">
            {editing ? (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleSave} loading={saving}>
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  loading={deleting}
                  icon={<TrashIcon className="w-4 h-4" />}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Delete
                </Button>
                <Button
                  onClick={handleEdit}
                  icon={<PencilIcon className="w-4 h-4" />}
                >
                  Edit
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Language Settings */}
      <Card padding="lg" className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Language Settings</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Source Language
            </label>
            {editing ? (
              <select
                value={editSourceLanguage}
                onChange={(e) => setEditSourceLanguage(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            ) : (
              <p className="text-lg text-slate-900">
                {LANGUAGES.find(l => l.code === glossary.sourceLanguage)?.name || glossary.sourceLanguage}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Target Language
            </label>
            {editing ? (
              <select
                value={editTargetLanguage}
                onChange={(e) => setEditTargetLanguage(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {LANGUAGES.filter(lang => lang.code !== editSourceLanguage).map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            ) : (
              <p className="text-lg text-slate-900">
                {LANGUAGES.find(l => l.code === glossary.targetLanguage)?.name || glossary.targetLanguage}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Entries */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-900">
            Entries ({editing ? editEntries.length : glossary.entries.length})
          </h2>
          {editing && (
            <Button
              variant="outline"
              onClick={addEntry}
              icon={<PlusIcon className="w-4 h-4" />}
              size="sm"
            >
              Add Entry
            </Button>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            {editEntries.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg"
              >
                <div className="flex-1">
                  <input
                    type="text"
                    value={entry.source}
                    onChange={(e) => updateEntry(entry.id, 'source', e.target.value)}
                    placeholder="Source term"
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="text-slate-400">→</div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={entry.target}
                    onChange={(e) => updateEntry(entry.id, 'target', e.target.value)}
                    placeholder="Target term"
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={() => removeEntry(entry.id)}
                  className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
            {editEntries.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <p>No entries yet. Click "Add Entry" to get started.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {glossary.entries.map((entry, index) => (
              <div key={entry.id} className="flex items-center space-x-4 p-3 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <span className="font-medium text-slate-900">{entry.source}</span>
                </div>
                <div className="text-slate-400">→</div>
                <div className="flex-1">
                  <span className="text-slate-700">{entry.target}</span>
                </div>
              </div>
            ))}
            {glossary.entries.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <p>No entries in this glossary.</p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}