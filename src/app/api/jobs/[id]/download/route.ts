import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { translationJobs } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/user';
import { eq, and } from 'drizzle-orm';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

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

    const job = await db
      .select()
      .from(translationJobs)
      .where(and(
        eq(translationJobs.id, params.id),
        eq(translationJobs.userId, user.id)
      ))
      .limit(1);

    if (job.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const jobData = job[0];

    if (jobData.status !== 'completed' || !jobData.outputFilePath) {
      return NextResponse.json({ error: 'Translation not completed' }, { status: 400 });
    }

    if (!existsSync(jobData.outputFilePath)) {
      return NextResponse.json({ error: 'Output file not found' }, { status: 404 });
    }

    const fileBuffer = await readFile(jobData.outputFilePath);
    const fileName = jobData.outputFileName || `translated_${jobData.sourceFileName}`;

    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
    headers.set('Content-Type', 'application/octet-stream');

    return new NextResponse(fileBuffer, { headers });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}