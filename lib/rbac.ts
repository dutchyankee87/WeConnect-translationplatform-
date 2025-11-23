import { auth } from '@clerk/nextjs/server';
import { getCurrentUser } from '@/lib/user';

// Define role hierarchy and permissions
export type UserRole = 'creator' | 'translator' | 'reviewer' | 'approver' | 'admin';

export interface Permission {
  resource: string;
  action: string;
}

// Role permissions matrix
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  creator: [
    { resource: 'jobs', action: 'create' },
    { resource: 'jobs', action: 'read_own' },
    { resource: 'glossaries', action: 'read' },
  ],
  translator: [
    { resource: 'jobs', action: 'create' },
    { resource: 'jobs', action: 'read_own' },
    { resource: 'glossaries', action: 'read' },
    { resource: 'tasks', action: 'read_assigned' },
    { resource: 'tasks', action: 'edit_assigned' },
    { resource: 'tasks', action: 'submit' },
  ],
  reviewer: [
    { resource: 'jobs', action: 'create' },
    { resource: 'jobs', action: 'read_own' },
    { resource: 'glossaries', action: 'read' },
    { resource: 'tasks', action: 'read_assigned' },
    { resource: 'tasks', action: 'review' },
    { resource: 'tasks', action: 'request_changes' },
  ],
  approver: [
    { resource: 'jobs', action: 'create' },
    { resource: 'jobs', action: 'read_own' },
    { resource: 'glossaries', action: 'read' },
    { resource: 'tasks', action: 'read_assigned' },
    { resource: 'tasks', action: 'review' },
    { resource: 'tasks', action: 'approve' },
    { resource: 'tasks', action: 'request_changes' },
  ],
  admin: [
    { resource: 'jobs', action: 'create' },
    { resource: 'jobs', action: 'read_all' },
    { resource: 'jobs', action: 'delete' },
    { resource: 'glossaries', action: 'read' },
    { resource: 'glossaries', action: 'create' },
    { resource: 'glossaries', action: 'edit' },
    { resource: 'glossaries', action: 'delete' },
    { resource: 'tasks', action: 'read_all' },
    { resource: 'tasks', action: 'assign' },
    { resource: 'tasks', action: 'edit_all' },
    { resource: 'tasks', action: 'delete' },
    { resource: 'users', action: 'read_all' },
    { resource: 'users', action: 'edit_roles' },
    { resource: 'audit', action: 'read_all' },
  ],
};

// Role hierarchy (higher roles inherit permissions from lower roles)
const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  creator: [],
  translator: ['creator'],
  reviewer: ['creator'],
  approver: ['creator', 'reviewer'],
  admin: ['creator', 'translator', 'reviewer', 'approver'],
};

export class RBACService {
  
  /**
   * Check if a user has a specific permission
   */
  static async hasPermission(
    userRole: UserRole,
    resource: string,
    action: string,
    context?: { userId?: string; taskAssignedTo?: string }
  ): Promise<boolean> {
    // Get all permissions for the user's role (including inherited ones)
    const userPermissions = this.getAllPermissionsForRole(userRole);
    
    // Check for exact permission match
    const hasDirectPermission = userPermissions.some(
      permission => permission.resource === resource && permission.action === action
    );
    
    if (hasDirectPermission) {
      return true;
    }
    
    // Check for context-specific permissions
    if (context) {
      // For "read_own" or "edit_own" permissions
      if (action.endsWith('_own') && context.userId) {
        const baseAction = action.replace('_own', '_all');
        const hasOwnershipPermission = userPermissions.some(
          permission => permission.resource === resource && 
          (permission.action === action || permission.action === baseAction)
        );
        return hasOwnershipPermission;
      }
      
      // For "read_assigned" or "edit_assigned" permissions
      if (action.endsWith('_assigned') && context.taskAssignedTo && context.userId) {
        const isAssigned = context.taskAssignedTo === context.userId;
        if (isAssigned) {
          const baseAction = action.replace('_assigned', '');
          return userPermissions.some(
            permission => permission.resource === resource && 
            (permission.action === action || permission.action === baseAction)
          );
        }
      }
    }
    
    return false;
  }
  
  /**
   * Get all permissions for a role (including inherited permissions)
   */
  private static getAllPermissionsForRole(role: UserRole): Permission[] {
    const permissions: Permission[] = [...ROLE_PERMISSIONS[role]];
    
    // Add inherited permissions
    const inheritedRoles = ROLE_HIERARCHY[role];
    for (const inheritedRole of inheritedRoles) {
      permissions.push(...ROLE_PERMISSIONS[inheritedRole]);
    }
    
    // Remove duplicates
    return permissions.filter((permission, index, self) => 
      index === self.findIndex(p => p.resource === permission.resource && p.action === permission.action)
    );
  }
  
  /**
   * Check if user can access a specific route
   */
  static async canAccessRoute(userRole: UserRole, route: string): Promise<boolean> {
    const routePermissions: Record<string, { resource: string; action: string }> = {
      '/dashboard': { resource: 'jobs', action: 'read_own' },
      '/dashboard/history': { resource: 'jobs', action: 'read_own' },
      '/dashboard/glossaries': { resource: 'glossaries', action: 'read' },
      '/tasks': { resource: 'tasks', action: 'read_assigned' },
      '/admin': { resource: 'users', action: 'read_all' },
    };
    
    const permission = routePermissions[route];
    if (!permission) {
      return true; // Allow access to routes without specific permissions
    }
    
    return this.hasPermission(userRole, permission.resource, permission.action);
  }
  
  /**
   * Get user role or throw error if not authenticated
   */
  static async requireAuth(): Promise<{ user: any; role: UserRole }> {
    const { userId } = await auth();
    if (!userId) {
      throw new Error('Unauthorized: No user session');
    }
    
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized: User not found');
    }
    
    return { user, role: user.role as UserRole };
  }
  
  /**
   * Require specific permission or throw error
   */
  static async requirePermission(
    resource: string,
    action: string,
    context?: { userId?: string; taskAssignedTo?: string }
  ): Promise<{ user: any; role: UserRole }> {
    const { user, role } = await this.requireAuth();
    
    const hasPermission = await this.hasPermission(
      role,
      resource,
      action,
      { ...context, userId: user.id }
    );
    
    if (!hasPermission) {
      throw new Error(`Forbidden: Missing permission ${resource}:${action}`);
    }
    
    return { user, role };
  }
  
  /**
   * Require specific role or higher
   */
  static async requireRole(minRole: UserRole): Promise<{ user: any; role: UserRole }> {
    const { user, role } = await this.requireAuth();
    
    const roleOrder: UserRole[] = ['creator', 'translator', 'reviewer', 'approver', 'admin'];
    const userRoleLevel = roleOrder.indexOf(role);
    const minRoleLevel = roleOrder.indexOf(minRole);
    
    if (userRoleLevel < minRoleLevel) {
      throw new Error(`Forbidden: Requires ${minRole} role or higher`);
    }
    
    return { user, role };
  }
}

// Utility functions for common role checks
export async function requireAdmin() {
  return RBACService.requireRole('admin');
}

export async function requireApprover() {
  return RBACService.requireRole('approver');
}

export async function requireReviewer() {
  return RBACService.requireRole('reviewer');
}

export async function requireTranslator() {
  return RBACService.requireRole('translator');
}

export async function canManageJobs(userRole: UserRole): Promise<boolean> {
  return RBACService.hasPermission(userRole, 'jobs', 'read_all');
}

export async function canManageGlossaries(userRole: UserRole): Promise<boolean> {
  return RBACService.hasPermission(userRole, 'glossaries', 'create');
}

export async function canManageTasks(userRole: UserRole): Promise<boolean> {
  return RBACService.hasPermission(userRole, 'tasks', 'assign');
}

export async function canViewAllTasks(userRole: UserRole): Promise<boolean> {
  return RBACService.hasPermission(userRole, 'tasks', 'read_all');
}