"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  EyeIcon, 
  UserIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface Task {
  id: string;
  jobId: string;
  sourceLanguage: string;
  targetLanguage: string;
  status: 'draft' | 'in_review' | 'changes_requested' | 'approved';
  createdAt: string;
  updatedAt: string;
  assignedToName?: string;
  assignedToEmail?: string;
  jobFileName: string;
}

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState<'my-tasks' | 'all-tasks'>('my-tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('creator');

  useEffect(() => {
    fetchTasks();
    fetchUserRole();
  }, [activeTab]);

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

  const fetchTasks = async () => {
    try {
      const url = activeTab === 'all-tasks' ? '/api/tasks?all=true' : '/api/tasks';
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTakeTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'take_task' }),
      });

      if (response.ok) {
        fetchTasks(); // Refresh tasks
      } else {
        alert('Failed to take task');
      }
    } catch (error) {
      alert('Error taking task');
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";
    switch (status) {
      case 'approved':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'in_review':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'changes_requested':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'draft':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'in_review':
        return <ClockIcon className="h-4 w-4 text-blue-500" />;
      case 'changes_requested':
        return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-400" />;
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

  const canViewAllTasks = ['admin'].includes(userRole);

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Translation Tasks</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage translation tasks and workflow assignments.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('my-tasks')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'my-tasks'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            My Tasks
          </button>
          {canViewAllTasks && (
            <button
              onClick={() => setActiveTab('all-tasks')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'all-tasks'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Tasks
            </button>
          )}
        </nav>
      </div>

      {/* Tasks Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading tasks...</div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden rounded-md">
          {tasks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File & Languages
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    {activeTab === 'all-tasks' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assigned To
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Updated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                            {task.jobFileName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {task.sourceLanguage} → {task.targetLanguage}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(task.status)}
                          <span className={`ml-2 ${getStatusBadge(task.status)}`}>
                            {task.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </td>
                      {activeTab === 'all-tasks' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {task.assignedToName ? (
                            <div className="flex items-center">
                              <UserIcon className="h-4 w-4 text-gray-400 mr-1" />
                              <span className="text-sm text-gray-900">
                                {task.assignedToName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">Unassigned</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(task.updatedAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/editor/${task.id}`}
                            className="inline-flex items-center text-indigo-600 hover:text-indigo-900"
                          >
                            <EyeIcon className="h-4 w-4 mr-1" />
                            {task.status === 'draft' ? 'Edit' : 'View'}
                          </Link>
                          
                          {!task.assignedToName && task.status === 'draft' && activeTab === 'my-tasks' && (
                            <button
                              onClick={() => handleTakeTask(task.id)}
                              className="inline-flex items-center text-green-600 hover:text-green-900"
                            >
                              <UserIcon className="h-4 w-4 mr-1" />
                              Take Task
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {activeTab === 'my-tasks' ? 'No Tasks Assigned' : 'No Tasks Available'}
              </h3>
              <p className="text-gray-500 mb-4">
                {activeTab === 'my-tasks' 
                  ? "You don't have any translation tasks assigned to you at the moment."
                  : "There are no translation tasks in the system yet."
                }
              </p>
              {activeTab === 'my-tasks' && (
                <p className="text-sm text-gray-400">
                  Tasks will appear here when you're assigned translation work or when you take available tasks.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}