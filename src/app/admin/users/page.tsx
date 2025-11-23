"use client";

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { 
  UserIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'creator' | 'translator' | 'reviewer' | 'approver' | 'admin';
  createdAt: string;
}

const ROLES = [
  { value: 'creator', label: 'Creator', description: 'Can create and manage own translation jobs' },
  { value: 'translator', label: 'Translator', description: 'Can translate and edit assigned tasks' },
  { value: 'reviewer', label: 'Reviewer', description: 'Can review and request changes to translations' },
  { value: 'approver', label: 'Approver', description: 'Can approve final translations' },
  { value: 'admin', label: 'Administrator', description: 'Full system access and user management' },
];

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<string>('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (response.ok) {
        await fetchUsers();
        setEditingUser(null);
        setNewRole('');
      } else {
        alert('Failed to update user role');
      }
    } catch (error) {
      alert('Error updating user role');
    }
  };

  const startEdit = (userId: string, currentRole: string) => {
    setEditingUser(userId);
    setNewRole(currentRole);
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setNewRole('');
  };

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      creator: 'bg-gray-100 text-gray-800',
      translator: 'bg-blue-100 text-blue-800',
      reviewer: 'bg-yellow-100 text-yellow-800',
      approver: 'bg-green-100 text-green-800',
      admin: 'bg-red-100 text-red-800',
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <ProtectedRoute requiredRole="admin">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading users...</div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage user roles and permissions across the translation platform.
          </p>
        </div>

        {/* Role Descriptions */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Role Definitions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ROLES.map((role) => (
              <div key={role.value} className="border rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(role.value)}`}>
                    {role.label}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{role.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white shadow overflow-hidden rounded-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              System Users ({users.length})
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-gray-500" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingUser === user.id ? (
                        <div className="flex items-center space-x-2">
                          <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {ROLES.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleRoleChange(user.id, newRole)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-red-600 hover:text-red-800"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                          {ROLES.find(r => r.value === user.role)?.label || user.role}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(user.createdAt)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {editingUser !== user.id && (
                        <button
                          onClick={() => startEdit(user.id, user.role)}
                          className="inline-flex items-center text-indigo-600 hover:text-indigo-900"
                        >
                          <PencilSquareIcon className="h-4 w-4 mr-1" />
                          Edit Role
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="text-center py-12">
              <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <div className="text-gray-500">No users found in the system.</div>
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-4">
          {ROLES.map((role) => {
            const count = users.filter(user => user.role === role.value).length;
            return (
              <div key={role.value} className="bg-white shadow rounded-lg p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{count}</div>
                  <div className="text-sm text-gray-500">{role.label}s</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ProtectedRoute>
  );
}