import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { batchJobs, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, sourceLanguage, targetLanguage, glossaryId, fileCount } = body;

    // Validate required fields
    if (!name || !sourceLanguage || !targetLanguage || !fileCount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Create batch job
    const [batchJob] = await db
      .insert(batchJobs)
      .values({
        userId: user[0].id,
        name,
        sourceLanguage,
        targetLanguage,
        glossaryId: glossaryId || null,
        totalFiles: fileCount,
        completedFiles: 0,
        failedFiles: 0,
        status: 'queued',
      })
      .returning();

    return NextResponse.json({
      success: true,
      batchJob,
    });

  } catch (error) {
    console.error('Batch job creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const user = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's batch jobs
    const userBatchJobs = await db
      .select()
      .from(batchJobs)
      .where(eq(batchJobs.userId, user[0].id))
      .orderBy(batchJobs.createdAt);

    return NextResponse.json({
      success: true,
      batchJobs: userBatchJobs,
    });

  } catch (error) {
    console.error('Batch jobs fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}