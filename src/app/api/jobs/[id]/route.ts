import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { translationJobs, translationQAResults } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/user';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    const job = await db
      .select()
      .from(translationJobs)
      .where(and(
        eq(translationJobs.id, id),
        eq(translationJobs.userId, user.id)
      ))
      .limit(1);

    if (job.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const currentJob = job[0];

    // If it's a multi-language job, get child jobs progress
    let childJobs: any[] = [];
    if (currentJob.isMultiLanguage === 'true') {
      childJobs = await db
        .select()
        .from(translationJobs)
        .where(eq(translationJobs.parentJobId, id));
    }

    // Get QA results if available
    const qaResults = await db
      .select()
      .from(translationQAResults)
      .where(eq(translationQAResults.jobId, id))
      .limit(1);

    return NextResponse.json({ 
      success: true, 
      job: currentJob,
      childJobs: childJobs, // Include child job statuses for multi-language
      qa: qaResults.length > 0 ? qaResults[0] : null
    });
  } catch (error) {
    console.error('Job fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}