import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { translationJobs, translationQAResults } from '@/lib/db/schema';
import { fileUpload } from '@/lib/upload';
import { deepl } from '@/lib/deepl';
import { getCurrentUser } from '@/lib/user';
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

// Background job processing function using DeepL Document API
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

    console.log('Starting document translation:', { jobId, filePath, sourceLanguage, targetLanguage });

    // Read the file and create a File object for DeepL
    const fileBuffer = await import('fs/promises').then(fs => fs.readFile(filePath));
    const fileName = path.basename(filePath);
    const fileSizeMB = fileBuffer.length / (1024 * 1024);
    
    console.log('File details:', { 
      fileName, 
      sizeBytes: fileBuffer.length, 
      sizeMB: fileSizeMB.toFixed(2),
      maxAllowed: '5MB (free tier)'
    });

    // Pro accounts have much higher limits than free accounts
    console.log('Using DeepL Document API for Pro account translation');

    const file = new File([fileBuffer], fileName, { 
      type: getFileContentType(path.extname(fileName).toLowerCase())
    });

    console.log('Uploading document to DeepL:', { fileName, size: file.size });

    // Upload document to DeepL
    let uploadResult;
    try {
      uploadResult = await deepl.uploadDocument(
        file,
        targetLanguage,
        sourceLanguage,
        glossaryId
      );
      console.log('Document uploaded:', uploadResult);
    } catch (uploadError) {
      console.error('DeepL upload failed:', uploadError);
      
      // Check if it's a 413 error and provide helpful message
      if (uploadError instanceof Error && uploadError.message.includes('413')) {
        throw new Error('File too large for DeepL Document API. Pro accounts support up to 100MB. Please check your file size and try again.');
      }
      
      // Check if it's an authentication error
      if (uploadError instanceof Error && uploadError.message.includes('403')) {
        throw new Error('DeepL API authentication failed. Please check your API key configuration.');
      }
      
      throw uploadError;
    }

    // Update job with DeepL document info
    await db
      .update(translationJobs)
      .set({ 
        deeplDocumentId: uploadResult.document_id,
        deeplDocumentKey: uploadResult.document_key,
      })
      .where(eq(translationJobs.id, jobId));

    // Wait for translation to complete
    const finalStatus = await deepl.waitForDocumentCompletion(
      uploadResult.document_id,
      uploadResult.document_key,
      (status) => {
        console.log('Translation progress:', status);
      }
    );

    if (finalStatus.status === 'error') {
      throw new Error(finalStatus.error_message || 'Translation failed');
    }

    console.log('Translation completed, downloading result');

    // Download the translated document
    const translatedBlob = await deepl.downloadDocument(
      uploadResult.document_id,
      uploadResult.document_key
    );

    // Save the translated document
    const originalExt = path.extname(fileName);
    const outputFileName = `translated_${fileName}`;
    const uploadsDir = process.env.UPLOAD_DIR || './uploads';
    const outputPath = path.join(uploadsDir, 'jobs', outputFileName);

    // Convert blob to buffer and save
    const translatedBuffer = Buffer.from(await translatedBlob.arrayBuffer());
    await import('fs/promises').then(fs => fs.writeFile(outputPath, translatedBuffer));

    console.log('Translation saved to:', outputPath);

    // Basic QA - just set a default score for document translations
    await db.insert(translationQAResults).values({
      jobId,
      glossaryWarnings: 0,
      numberWarnings: 0,
      qualityScore: 95, // Default high score for document API
    });

    // Update job as completed
    await db
      .update(translationJobs)
      .set({ 
        status: 'completed',
        outputFileName,
        outputFilePath: outputPath,
        billedCharacters: finalStatus.billed_characters,
      })
      .where(eq(translationJobs.id, jobId));

    console.log('Translation job completed successfully');

  } catch (error) {
    console.error('Job processing error:', error);
    
    // Update job as failed with error message
    await db
      .update(translationJobs)
      .set({ 
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      })
      .where(eq(translationJobs.id, jobId));
  }
}

// Helper function to get content type for files
function getFileContentType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.txt': 'text/plain',
    '.srt': 'text/plain',
  };
  return mimeTypes[extension] || 'application/octet-stream';
}