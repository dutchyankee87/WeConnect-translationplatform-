import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { translationJobs, translationMemory, taskSegments, translationTasks, translationQAResults, glossaryEntries } from '@/lib/db/schema';
import { fileUpload } from '@/lib/upload';
import { FileProcessor } from '@/lib/file-processor';
import { deepl } from '@/lib/deepl';
import { getCurrentUser } from '@/lib/user';
import QAChecker from '@/lib/qa';
import { eq, desc } from 'drizzle-orm';
import path from 'path';

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

    const { file, formData } = await fileUpload.handleFormDataUpload(request);

    if (!file || !file.success) {
      return NextResponse.json({ error: 'File upload failed' }, { status: 400 });
    }

    const { sourceLanguage, targetLanguage, glossaryId } = formData;

    if (!sourceLanguage || !targetLanguage) {
      return NextResponse.json({ error: 'Source and target languages are required' }, { status: 400 });
    }

    // Create translation job
    const [job] = await db
      .insert(translationJobs)
      .values({
        userId: user.id,
        sourceLanguage,
        targetLanguage,
        sourceFileName: file.fileName!,
        sourceFilePath: file.filePath!,
        glossaryId: glossaryId || null,
        status: 'pending',
      })
      .returning();

    // Start background processing
    processTranslationJob(job.id, file.filePath!, sourceLanguage, targetLanguage, glossaryId);

    return NextResponse.json({ 
      success: true, 
      job: {
        id: job.id,
        status: job.status,
        sourceFileName: job.sourceFileName,
        sourceLanguage: job.sourceLanguage,
        targetLanguage: job.targetLanguage,
      }
    });
  } catch (error) {
    console.error('Job creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    const jobs = await db
      .select({
        id: translationJobs.id,
        sourceFileName: translationJobs.sourceFileName,
        sourceLanguage: translationJobs.sourceLanguage,
        targetLanguage: translationJobs.targetLanguage,
        status: translationJobs.status,
        createdAt: translationJobs.createdAt,
        glossaryId: translationJobs.glossaryId,
        qaScore: translationQAResults.qualityScore,
      })
      .from(translationJobs)
      .leftJoin(translationQAResults, eq(translationJobs.id, translationQAResults.jobId))
      .where(eq(translationJobs.userId, user.id))
      .orderBy(desc(translationJobs.createdAt));

    return NextResponse.json({ success: true, jobs });
  } catch (error) {
    console.error('Jobs fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Background job processing function
async function processTranslationJob(
  jobId: string, 
  filePath: string, 
  sourceLanguage: string, 
  targetLanguage: string, 
  glossaryId?: string
) {
  try {
    // Update job status to processing
    await db
      .update(translationJobs)
      .set({ status: 'processing' })
      .where(eq(translationJobs.id, jobId));

    // Extract text segments from file
    const segments = await FileProcessor.extractTextSegments(filePath);

    // Create a translation task
    const [task] = await db
      .insert(translationTasks)
      .values({
        jobId,
        sourceLanguage,
        targetLanguage,
        status: 'draft',
      })
      .returning();

    // Check translation memory for existing translations
    const processedSegments = [];
    
    for (let i = 0; i < segments.length; i++) {
      const sourceText = segments[i];
      let targetText = '';

      // Check translation memory first
      const tmMatches = await db
        .select()
        .from(translationMemory)
        .where(eq(translationMemory.sourceSegment, sourceText))
        .limit(1);

      if (tmMatches.length > 0) {
        targetText = tmMatches[0].targetSegment;
      } else {
        // Translate using DeepL
        try {
          targetText = await deepl.translateText(
            sourceText, 
            targetLanguage, 
            sourceLanguage, 
            glossaryId || undefined
          );

          // Store in translation memory
          await db.insert(translationMemory).values({
            jobId,
            sourceSegment: sourceText,
            targetSegment: targetText,
            sourceLanguage,
            targetLanguage,
          });
        } catch (translationError) {
          console.error('Translation error for segment:', translationError);
          targetText = sourceText; // Fallback to source text
        }
      }

      // Store task segment
      await db.insert(taskSegments).values({
        taskId: task.id,
        segmentIndex: i,
        sourceText,
        targetText,
      });

      processedSegments.push({
        index: i,
        sourceText,
        targetText,
      });
    }

    // Perform QA checks
    let glossaryTerms: Array<{ sourceTerm: string; targetTerm: string }> = [];
    if (glossaryId) {
      const glossaryData = await db
        .select()
        .from(glossaryEntries)
        .where(eq(glossaryEntries.glossaryId, glossaryId));
      
      glossaryTerms = glossaryData.map(entry => ({
        sourceTerm: entry.sourceTerm,
        targetTerm: entry.targetTerm,
      }));
    }

    const qaResult = await QAChecker.performQA(
      processedSegments.map(seg => ({
        sourceText: seg.sourceText,
        targetText: seg.targetText,
      })),
      glossaryTerms
    );

    // Store QA results
    await db.insert(translationQAResults).values({
      jobId,
      glossaryWarnings: qaResult.glossaryWarnings,
      numberWarnings: qaResult.numberWarnings,
      qualityScore: qaResult.qualityScore,
    });

    // Create output file
    const outputFileName = `translated_${path.basename(filePath)}`;
    const outputPath = path.join(path.dirname(filePath), outputFileName);
    
    await FileProcessor.createOutputFile(filePath, processedSegments, outputPath);

    // Update job as completed
    await db
      .update(translationJobs)
      .set({ 
        status: 'completed',
        outputFileName,
        outputFilePath: outputPath,
      })
      .where(eq(translationJobs.id, jobId));

  } catch (error) {
    console.error('Job processing error:', error);
    
    // Update job as failed
    await db
      .update(translationJobs)
      .set({ status: 'failed' })
      .where(eq(translationJobs.id, jobId));
  }
}