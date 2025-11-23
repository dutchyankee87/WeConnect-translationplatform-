import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { translationTasks, taskSegments, auditEvents } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/user';
import { RBACService } from '@/lib/rbac';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get task details
    const task = await db
      .select()
      .from(translationTasks)
      .where(eq(translationTasks.id, params.id))
      .limit(1);

    if (task.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const taskData = task[0];

    // Check if user can access this task
    const canViewAll = await RBACService.hasPermission(
      user.role as any,
      'tasks',
      'read_all'
    );

    const isAssigned = taskData.assignedTo === user.id;
    
    if (!canViewAll && !isAssigned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get task segments
    const segments = await db
      .select()
      .from(taskSegments)
      .where(eq(taskSegments.taskId, params.id))
      .orderBy(taskSegments.segmentIndex);

    return NextResponse.json({ 
      success: true, 
      task: taskData,
      segments 
    });
  } catch (error) {
    console.error('Task fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get task details
    const task = await db
      .select()
      .from(translationTasks)
      .where(eq(translationTasks.id, params.id))
      .limit(1);

    if (task.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const taskData = task[0];
    const body = await request.json();
    const { action, assignedTo, comment } = body;

    // Check permissions for different actions
    let hasPermission = false;
    let newStatus = taskData.status;

    switch (action) {
      case 'assign':
        hasPermission = await RBACService.hasPermission(
          user.role as any,
          'tasks',
          'assign'
        );
        break;

      case 'submit_for_review':
        hasPermission = taskData.assignedTo === user.id &&
          await RBACService.hasPermission(user.role as any, 'tasks', 'submit');
        newStatus = 'in_review';
        break;

      case 'approve':
        hasPermission = await RBACService.hasPermission(
          user.role as any,
          'tasks',
          'approve'
        );
        newStatus = 'approved';
        break;

      case 'request_changes':
        hasPermission = await RBACService.hasPermission(
          user.role as any,
          'tasks',
          'request_changes'
        );
        newStatus = 'changes_requested';
        break;

      case 'take_task':
        hasPermission = !taskData.assignedTo &&
          await RBACService.hasPermission(user.role as any, 'tasks', 'edit_assigned');
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      'draft': ['in_review'],
      'in_review': ['approved', 'changes_requested'],
      'changes_requested': ['in_review'],
      'approved': [], // Final state
    };

    if (action !== 'assign' && action !== 'take_task') {
      const allowedStatuses = validTransitions[taskData.status] || [];
      if (!allowedStatuses.includes(newStatus)) {
        return NextResponse.json(
          { error: `Cannot transition from ${taskData.status} to ${newStatus}` },
          { status: 400 }
        );
      }
    }

    // Update task
    const updateData: any = { updatedAt: new Date() };
    
    if (action === 'assign' || action === 'take_task') {
      updateData.assignedTo = assignedTo || user.id;
    }
    
    if (newStatus !== taskData.status) {
      updateData.status = newStatus;
    }

    const [updatedTask] = await db
      .update(translationTasks)
      .set(updateData)
      .where(eq(translationTasks.id, params.id))
      .returning();

    // Create audit event
    await db.insert(auditEvents).values({
      taskId: params.id,
      userId: user.id,
      actionType: action,
      metadata: { comment, previousStatus: taskData.status, newStatus },
    });

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error) {
    console.error('Task update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}