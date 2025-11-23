import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { users, auditEvents } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/user';
import { RBACService } from '@/lib/rbac';
import { eq } from 'drizzle-orm';

const VALID_ROLES = ['creator', 'translator', 'reviewer', 'approver', 'admin'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has permission to edit roles
    const hasPermission = await RBACService.hasPermission(
      currentUser.role as any,
      'users',
      'edit_roles'
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { role } = body;

    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: ' + VALID_ROLES.join(', ') },
        { status: 400 }
      );
    }

    // Get the user to be updated
    const targetUser = await db
      .select()
      .from(users)
      .where(eq(users.id, params.id))
      .limit(1);

    if (targetUser.length === 0) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    const previousRole = targetUser[0].role;

    // Prevent users from removing their own admin role
    if (currentUser.id === params.id && currentUser.role === 'admin' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Cannot remove your own admin privileges' },
        { status: 400 }
      );
    }

    // Update user role
    const [updatedUser] = await db
      .update(users)
      .set({ 
        role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, params.id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      });

    // Create audit event
    await db.insert(auditEvents).values({
      userId: currentUser.id,
      actionType: 'user_role_updated',
      metadata: {
        targetUserId: params.id,
        targetUserEmail: targetUser[0].email,
        previousRole,
        newRole: role,
      },
    });

    return NextResponse.json({ 
      success: true, 
      user: updatedUser,
      message: `User role updated from ${previousRole} to ${role}`
    });
  } catch (error) {
    console.error('Role update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}