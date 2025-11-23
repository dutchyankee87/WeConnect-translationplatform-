import { NextRequest, NextResponse } from 'next/server';
import { RBACService, UserRole } from '@/lib/rbac';
import { getCurrentUser } from '@/lib/user';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { resource, action, context } = body;

    if (!resource || !action) {
      return NextResponse.json(
        { error: 'Resource and action are required' },
        { status: 400 }
      );
    }

    const hasPermission = await RBACService.hasPermission(
      user.role as UserRole,
      resource,
      action,
      { ...context, userId: user.id }
    );

    return NextResponse.json({ 
      success: true, 
      hasPermission,
      userRole: user.role 
    });
  } catch (error) {
    console.error('Permission check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}