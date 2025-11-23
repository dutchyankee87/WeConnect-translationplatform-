import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { translationTasks, taskSegments, auditEvents } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/user';
import { RBACService } from '@/lib/rbac';
import { eq, and } from 'drizzle-orm';

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

    // Check if user can edit this task
    const canEditAll = await RBACService.hasPermission(
      user.role as any,
      'tasks',
      'edit_all'
    );

    const canEditAssigned = await RBACService.hasPermission(
      user.role as any,
      'tasks',
      'edit_assigned'
    );

    const isAssigned = taskData.assignedTo === user.id;
    
    if (!canEditAll && !(canEditAssigned && isAssigned)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Can't edit approved tasks (unless admin)
    if (taskData.status === 'approved' && !canEditAll) {
      return NextResponse.json({ 
        error: 'Cannot edit approved task' 
      }, { status: 400 });
    }

    const body = await request.json();
    const { segments } = body;

    if (!Array.isArray(segments)) {
      return NextResponse.json({ 
        error: 'Segments must be an array' 
      }, { status: 400 });
    }

    // Update segments
    const updatedSegments = [];
    for (const segment of segments) {
      if (!segment.id || segment.targetText === undefined) {
        continue; // Skip invalid segments
      }

      const [updatedSegment] = await db
        .update(taskSegments)
        .set({
          targetText: segment.targetText,
          updatedAt: new Date(),
        })
        .where(and(
          eq(taskSegments.id, segment.id),
          eq(taskSegments.taskId, params.id)
        ))
        .returning();

      if (updatedSegment) {
        updatedSegments.push(updatedSegment);
      }
    }

    // Create audit event
    await db.insert(auditEvents).values({
      taskId: params.id,
      userId: user.id,
      actionType: 'segments_edited',
      metadata: { 
        segmentsUpdated: updatedSegments.length,
        timestamp: new Date().toISOString()
      },
    });

    return NextResponse.json({ 
      success: true, 
      updatedSegments: updatedSegments.length 
    });
  } catch (error) {
    console.error('Segment update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}