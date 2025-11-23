import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { translationTasks, users, translationJobs, taskSegments } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/user';
import { RBACService } from '@/lib/rbac';
import { eq, desc, and, or } from 'drizzle-orm';

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
    const showAll = url.searchParams.get('all') === 'true';
    const status = url.searchParams.get('status');

    let query;

    if (showAll) {
      // Check if user can view all tasks
      const hasPermission = await RBACService.hasPermission(
        user.role as any,
        'tasks',
        'read_all'
      );

      if (!hasPermission) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Admin can see all tasks
      query = db
        .select({
          id: translationTasks.id,
          jobId: translationTasks.jobId,
          sourceLanguage: translationTasks.sourceLanguage,
          targetLanguage: translationTasks.targetLanguage,
          status: translationTasks.status,
          createdAt: translationTasks.createdAt,
          updatedAt: translationTasks.updatedAt,
          assignedToName: users.name,
          assignedToEmail: users.email,
          jobFileName: translationJobs.sourceFileName,
        })
        .from(translationTasks)
        .leftJoin(users, eq(translationTasks.assignedTo, users.id))
        .leftJoin(translationJobs, eq(translationTasks.jobId, translationJobs.id));
    } else {
      // Regular users see only their assigned tasks
      query = db
        .select({
          id: translationTasks.id,
          jobId: translationTasks.jobId,
          sourceLanguage: translationTasks.sourceLanguage,
          targetLanguage: translationTasks.targetLanguage,
          status: translationTasks.status,
          createdAt: translationTasks.createdAt,
          updatedAt: translationTasks.updatedAt,
          jobFileName: translationJobs.sourceFileName,
        })
        .from(translationTasks)
        .leftJoin(translationJobs, eq(translationTasks.jobId, translationJobs.id))
        .where(
          or(
            eq(translationTasks.assignedTo, user.id),
            // If not assigned to anyone and user can take tasks
            and(
              eq(translationTasks.assignedTo, null),
              eq(translationTasks.status, 'draft')
            )
          )
        );
    }

    // Add status filter if provided
    if (status) {
      query = query.where(eq(translationTasks.status, status as any));
    }

    const tasks = await query.orderBy(desc(translationTasks.createdAt));

    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    console.error('Tasks fetch error:', error);
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

    // Check if user can create/assign tasks
    const hasPermission = await RBACService.hasPermission(
      user.role as any,
      'tasks',
      'assign'
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { jobId, assignedToId, sourceLanguage, targetLanguage } = body;

    if (!jobId || !sourceLanguage || !targetLanguage) {
      return NextResponse.json(
        { error: 'Job ID, source language, and target language are required' },
        { status: 400 }
      );
    }

    // Create the task
    const [task] = await db
      .insert(translationTasks)
      .values({
        jobId,
        sourceLanguage,
        targetLanguage,
        assignedTo: assignedToId || null,
        status: 'draft',
      })
      .returning();

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error('Task creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}