"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeftIcon,
  CheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface Task {
  id: string;
  jobId: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: 'draft' | 'in_review' | 'changes_requested' | 'approved';
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
}

interface TaskSegment {
  id: string;
  segmentIndex: number;
  sourceText: string;
  targetText: string;
  updatedAt: string;
}

interface TMSuggestion {
  sourceText: string;
  targetText: string;
  similarity: number;
}

interface AuditEvent {
  id: string;
  actionType: string;
  metadata: any;
  createdAt: string;
  userName?: string;
}

export default function TranslationEditorPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;

  const [task, setTask] = useState<Task | null>(null);
  const [segments, setSegments] = useState<TaskSegment[]>([]);
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<string>('creator');
  const [tmSuggestions, setTmSuggestions] = useState<TMSuggestion[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditEvent[]>([]);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState<'segments' | 'tm' | 'history'>('segments');

  useEffect(() => {
    if (taskId) {
      fetchTaskData();
      fetchUserRole();
      fetchAuditTrail();
    }
  }, [taskId]);

  const fetchUserRole = async () => {
    try {
      const response = await fetch('/api/user/profile');
      const data = await response.json();
      if (data.success) {
        setUserRole(data.user.role);
      }
    } catch (error) {
      console.error('Failed to fetch user role:', error);
    }
  };

  const fetchTaskData = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`);
      const data = await response.json();
      
      if (data.success) {
        setTask(data.task);
        setSegments(data.segments || []);
      } else {
        console.error('Failed to fetch task:', data.error);
      }
    } catch (error) {
      console.error('Error fetching task data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditTrail = async () => {
    try {
      const response = await fetch(`/api/audit?taskId=${taskId}`);
      const data = await response.json();
      if (data.success) {
        setAuditTrail(data.events || []);
      }
    } catch (error) {
      console.error('Failed to fetch audit trail:', error);
    }
  };

  const fetchTMSuggestions = async (sourceText: string) => {
    try {
      const response = await fetch('/api/tm/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceSegment: sourceText,
          sourceLanguage: task?.sourceLanguage,
          targetLanguage: task?.targetLanguage,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setTmSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to fetch TM suggestions:', error);
    }
  };

  const handleSegmentChange = (segmentId: string, newTargetText: string) => {
    setSegments(prev => prev.map(segment => 
      segment.id === segmentId 
        ? { ...segment, targetText: newTargetText }
        : segment
    ));

    // Clear existing auto-save timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    // Set new auto-save timer for 3 seconds
    const timer = setTimeout(() => {
      saveSegments([{ id: segmentId, targetText: newTargetText }]);
    }, 3000);
    
    setAutoSaveTimer(timer);
  };

  const saveSegments = async (segmentsToSave?: Array<{ id: string; targetText: string }>) => {
    if (saving) return;
    
    setSaving(true);
    try {
      const segmentsData = segmentsToSave || segments.map(s => ({ 
        id: s.id, 
        targetText: s.targetText 
      }));

      const response = await fetch(`/api/tasks/${taskId}/segments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segments: segmentsData }),
      });

      if (response.ok) {
        // Refresh audit trail after save
        setTimeout(fetchAuditTrail, 1000);
      }
    } catch (error) {
      console.error('Error saving segments:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTaskAction = async (action: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        await fetchTaskData();
        await fetchAuditTrail();
        
        if (action === 'submit_for_review' || action === 'approve') {
          router.push('/tasks');
        }
      } else {
        const data = await response.json();
        alert(data.error || 'Action failed');
      }
    } catch (error) {
      alert('Error performing action');
    }
  };

  const handleSegmentSelect = (index: number) => {
    setSelectedSegmentIndex(index);
    if (segments[index]) {
      fetchTMSuggestions(segments[index].sourceText);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'in_review': return 'bg-blue-100 text-blue-800';
      case 'changes_requested': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canEdit = task && ['draft', 'changes_requested'].includes(task.status);
  const canSubmit = task && task.status === 'draft' && ['translator', 'admin'].includes(userRole);
  const canApprove = task && task.status === 'in_review' && ['approver', 'admin'].includes(userRole);
  const canRequestChanges = task && task.status === 'in_review' && ['reviewer', 'approver', 'admin'].includes(userRole);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading translation editor...</div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-4xl">
        <div className="text-center py-8">
          <div className="text-gray-500">Task not found</div>
        </div>
      </div>
    );
  }

  const selectedSegment = segments[selectedSegmentIndex];

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              href="/tasks"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              Back to Tasks
            </Link>
            
            <div className="border-l border-gray-300 pl-4">
              <h1 className="text-lg font-semibold text-gray-900">Translation Editor</h1>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-sm text-gray-600">
                  {task.sourceLanguage} → {task.targetLanguage}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                  {task.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {saving && (
              <span className="text-sm text-gray-500 flex items-center">
                <ClockIcon className="h-4 w-4 mr-1" />
                Saving...
              </span>
            )}
            
            {canEdit && (
              <button
                onClick={() => saveSegments()}
                disabled={saving}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
              >
                Save Now
              </button>
            )}
            
            {canSubmit && (
              <button
                onClick={() => handleTaskAction('submit_for_review')}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Submit for Review
              </button>
            )}
            
            {canApprove && (
              <button
                onClick={() => handleTaskAction('approve')}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                <CheckIcon className="h-4 w-4 inline mr-1" />
                Approve
              </button>
            )}
            
            {canRequestChanges && (
              <button
                onClick={() => handleTaskAction('request_changes')}
                className="px-4 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
              >
                <ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />
                Request Changes
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Segments List */}
        <div className="w-1/2 bg-white border-r overflow-y-auto">
          <div className="p-4 border-b bg-gray-50">
            <h3 className="font-medium text-gray-900">Source Segments</h3>
            <p className="text-sm text-gray-600 mt-1">
              {segments.length} segments • Click to edit translation
            </p>
          </div>
          
          <div className="divide-y divide-gray-200">
            {segments.map((segment, index) => (
              <div
                key={segment.id}
                onClick={() => handleSegmentSelect(index)}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${
                  selectedSegmentIndex === index ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 mb-2">
                      Segment {segment.segmentIndex + 1}
                    </div>
                    <div className="text-sm text-gray-700 mb-2 leading-relaxed">
                      {segment.sourceText}
                    </div>
                    {segment.targetText && (
                      <div className="text-sm text-blue-700 bg-blue-50 p-2 rounded border-l-2 border-blue-200">
                        {segment.targetText}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-1/2 flex flex-col">
          {/* Editor Area */}
          <div className="flex-1 flex flex-col bg-white">
            <div className="p-4 border-b">
              <h3 className="font-medium text-gray-900">
                Edit Segment {selectedSegment ? selectedSegment.segmentIndex + 1 : 1}
              </h3>
            </div>
            
            {selectedSegment && (
              <div className="flex-1 p-4 space-y-4">
                {/* Source Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Source ({task.sourceLanguage})
                  </label>
                  <div className="p-3 bg-gray-50 rounded border text-sm leading-relaxed">
                    {selectedSegment.sourceText}
                  </div>
                </div>

                {/* Target Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Translation ({task.targetLanguage})
                  </label>
                  <textarea
                    value={selectedSegment.targetText || ''}
                    onChange={(e) => handleSegmentChange(selectedSegment.id, e.target.value)}
                    disabled={!canEdit}
                    className="w-full h-24 p-3 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none disabled:bg-gray-50 disabled:text-gray-500"
                    placeholder="Enter translation..."
                  />
                  {!canEdit && (
                    <p className="text-xs text-gray-500 mt-1">
                      Read-only: Task is {task.status.replace('_', ' ')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Side Panel Tabs */}
          <div className="h-80 border-t">
            <div className="flex border-b bg-gray-50">
              <button
                onClick={() => setActiveTab('tm')}
                className={`flex-1 px-4 py-2 text-sm font-medium ${
                  activeTab === 'tm'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <BookOpenIcon className="h-4 w-4 inline mr-1" />
                TM Suggestions
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 px-4 py-2 text-sm font-medium ${
                  activeTab === 'history'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <ChatBubbleLeftRightIcon className="h-4 w-4 inline mr-1" />
                History
              </button>
            </div>

            <div className="p-4 h-64 overflow-y-auto bg-white">
              {activeTab === 'tm' && (
                <div className="space-y-3">
                  {tmSuggestions.length > 0 ? (
                    tmSuggestions.map((suggestion, index) => (
                      <div key={index} className="border rounded p-3 hover:bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-green-600">
                            {Math.round(suggestion.similarity * 100)}% match
                          </span>
                          <button
                            onClick={() => selectedSegment && handleSegmentChange(
                              selectedSegment.id, 
                              suggestion.targetText
                            )}
                            disabled={!canEdit}
                            className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                          >
                            Use
                          </button>
                        </div>
                        <div className="text-sm text-gray-700 mb-1">
                          <strong>Source:</strong> {suggestion.sourceText}
                        </div>
                        <div className="text-sm text-blue-700">
                          <strong>Translation:</strong> {suggestion.targetText}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <BookOpenIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No translation memory suggestions available</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-3">
                  {auditTrail.length > 0 ? (
                    auditTrail.map((event) => (
                      <div key={event.id} className="border-l-2 border-gray-200 pl-3">
                        <div className="text-xs text-gray-500">
                          {new Date(event.createdAt).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-700">
                          {event.actionType.replace('_', ' ')}
                          {event.userName && ` by ${event.userName}`}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <ChatBubbleLeftRightIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No activity history available</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}