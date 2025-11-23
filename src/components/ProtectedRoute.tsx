"use client";

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { UserRole } from '@/lib/rbac';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: {
    resource: string;
    action: string;
  };
  fallback?: React.ReactNode;
}

export default function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
  fallback,
}: ProtectedRouteProps) {
  const { user, isLoaded } = useUser();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!isLoaded || !user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user role from our database
        const response = await fetch('/api/user/profile');
        const data = await response.json();
        
        if (data.success) {
          const role = data.user.role as UserRole;
          setUserRole(role);

          // Check role requirement
          if (requiredRole) {
            const roleOrder: UserRole[] = ['creator', 'translator', 'reviewer', 'approver', 'admin'];
            const userRoleLevel = roleOrder.indexOf(role);
            const requiredRoleLevel = roleOrder.indexOf(requiredRole);
            
            if (userRoleLevel >= requiredRoleLevel) {
              setHasAccess(true);
            }
          }
          // Check permission requirement
          else if (requiredPermission) {
            const permissionResponse = await fetch('/api/user/permissions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requiredPermission),
            });
            const permissionData = await permissionResponse.json();
            setHasAccess(permissionData.hasPermission);
          }
          // No specific requirement - just need to be authenticated
          else {
            setHasAccess(true);
          }
        }
      } catch (error) {
        console.error('Error checking access:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [user, isLoaded, requiredRole, requiredPermission]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Please sign in to continue.</div>
      </div>
    );
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-bold">!</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-red-800">Access Denied</h3>
              <div className="mt-2 text-sm text-red-700">
                {requiredRole && (
                  <p>This page requires <strong>{requiredRole}</strong> role or higher.</p>
                )}
                {requiredPermission && (
                  <p>
                    You don't have permission to access this resource. 
                    Required: <strong>{requiredPermission.resource}:{requiredPermission.action}</strong>
                  </p>
                )}
                {userRole && (
                  <p className="mt-2">Your current role: <strong>{userRole}</strong></p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Convenience components for common role requirements
export function AdminOnlyRoute({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="admin" fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

export function ApproverOnlyRoute({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="approver" fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

export function ReviewerOnlyRoute({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="reviewer" fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

export function TranslatorOnlyRoute({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="translator" fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}