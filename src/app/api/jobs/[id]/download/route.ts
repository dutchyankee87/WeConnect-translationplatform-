import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { translationJobs } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/user';
import { eq, and } from 'drizzle-orm';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

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

    console.log('Job data:', {
      id: jobData.id,
      status: jobData.status,
      outputFilePath: jobData.outputFilePath,
      outputFileName: jobData.outputFileName
    });

    if (jobData.status !== 'completed') {
      return NextResponse.json({ 
        error: `Translation not completed. Status: ${jobData.status}`,
        status: jobData.status
      }, { status: 400 });
    }

    if (!jobData.outputFilePath) {
      return NextResponse.json({ 
        error: 'No output file path set for this job' 
      }, { status: 400 });
    }

    if (!existsSync(jobData.outputFilePath)) {
      console.error('Output file not found at path:', jobData.outputFilePath);
      return NextResponse.json({ 
        error: 'Output file not found',
        path: jobData.outputFilePath
      }, { status: 404 });
    }

    const fileBuffer = await readFile(jobData.outputFilePath);
    const fileName = jobData.outputFileName || `translated_${jobData.sourceFileName}`;

    // Determine correct content type based on file extension
    const fileExt = path.extname(fileName).toLowerCase();
    let contentType = 'application/octet-stream';
    
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.srt': 'text/plain',
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    
    if (mimeTypes[fileExt]) {
      contentType = mimeTypes[fileExt];
    }

    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
    headers.set('Content-Type', contentType);

    return new NextResponse(fileBuffer, { headers });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}