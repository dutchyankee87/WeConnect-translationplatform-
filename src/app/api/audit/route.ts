import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { auditEvents, users, translationTasks } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/user';
import { RBACService } from '@/lib/rbac';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const taskId = url.searchParams.get('taskId');
    const jobId = url.searchParams.get('jobId');

    let whereCondition;
    
    if (taskId) {
      // Check if user can view this task's audit trail
      const task = await db
        .select()
        .from(translationTasks)
        .where(eq(translationTasks.id, taskId))
        .limit(1);

      if (task.length === 0) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }

      const taskData = task[0];
      const canViewAll = await RBACService.hasPermission(
        user.role as any,
        'audit',
        'read_all'
      );
      
      const isAssigned = taskData.assignedTo === user.id;

      if (!canViewAll && !isAssigned) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      whereCondition = eq(auditEvents.taskId, taskId);
    } else if (jobId) {
      whereCondition = eq(auditEvents.jobId, jobId);
    } else {
      // Check if user can view all audit events
      const canViewAll = await RBACService.hasPermission(
        user.role as any,
        'audit',
        'read_all'
      );

      if (!canViewAll) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      whereCondition = undefined; // No filter, return all events
    }

    // Build query
    let query = db
      .select({
        id: auditEvents.id,
        taskId: auditEvents.taskId,
        jobId: auditEvents.jobId,
        actionType: auditEvents.actionType,
        metadata: auditEvents.metadata,
        createdAt: auditEvents.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(auditEvents)
      .leftJoin(users, eq(auditEvents.userId, users.id));

    if (whereCondition) {
      query = query.where(whereCondition);
    }

    const events = await query
      .orderBy(desc(auditEvents.createdAt))
      .limit(100);

    return NextResponse.json({ success: true, events });
  } catch (error) {
    console.error('Audit fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const { taskId, jobId, actionType, metadata } = body;

    if (!actionType) {
      return NextResponse.json(
        { error: 'Action type is required' },
        { status: 400 }
      );
    }

    const [event] = await db
      .insert(auditEvents)
      .values({
        taskId: taskId || null,
        jobId: jobId || null,
        userId: user.id,
        actionType,
        metadata: metadata || {},
      })
      .returning();

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error('Audit event creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}