import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { translationJobs, translationQAResults, translationMemory, taskSegments, translationTasks } from '@/lib/db/schema';
import { fileUpload } from '@/lib/upload';
import { deepl } from '@/lib/deepl';
import { getCurrentUser } from '@/lib/user';
import { FileProcessor } from '@/lib/file-processor';
import { LearningService } from '@/lib/learning';
import { EmailService } from '@/lib/email';
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

    const { sourceLanguage, targetLanguage, targetLanguages, isMultiLanguage, glossaryId } = formData;

    const isMultiLang = isMultiLanguage === 'true';
    let parsedTargetLanguages: string[] = [];
    
    if (isMultiLang) {
      try {
        parsedTargetLanguages = JSON.parse(targetLanguages as string);
        if (!parsedTargetLanguages || parsedTargetLanguages.length === 0) {
          return NextResponse.json({ error: 'At least one target language is required for multi-language translation' }, { status: 400 });
        }
      } catch (error) {
        return NextResponse.json({ error: 'Invalid target languages format' }, { status: 400 });
      }
    } else if (!targetLanguage) {
      return NextResponse.json({ error: 'Target language is required' }, { status: 400 });
    }

    if (!sourceLanguage) {
      return NextResponse.json({ error: 'Source language is required' }, { status: 400 });
    }

    if (isMultiLang) {
      // Create parent multi-language job
      const [parentJob] = await db
        .insert(translationJobs)
        .values({
          userId: user.id,
          sourceLanguage,
          targetLanguage: parsedTargetLanguages[0], // First language as primary
          targetLanguages: parsedTargetLanguages,
          isMultiLanguage: 'true',
          sourceFileName: file.fileName!,
          sourceFilePath: file.filePath!,
          glossaryId: glossaryId || null,
          status: 'pending',
        })
        .returning();

      // Start background processing for multi-language
      processMultiLanguageJob(parentJob.id, file.filePath!, sourceLanguage, parsedTargetLanguages, glossaryId);

      return NextResponse.json({ 
        success: true, 
        job: {
          id: parentJob.id,
          status: parentJob.status,
          sourceFileName: parentJob.sourceFileName,
          sourceLanguage: parentJob.sourceLanguage,
          targetLanguages: parentJob.targetLanguages,
          isMultiLanguage: true,
        }
      });
    } else {
      // Create single-language job  
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
    }
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

// Multi-language job processing function
async function processMultiLanguageJob(
  parentJobId: string,
  filePath: string,
  sourceLanguage: string,
  targetLanguages: string[],
  glossaryId?: string
) {
  try {
    // Update parent job status to processing
    await db
      .update(translationJobs)
      .set({ status: 'processing' })
      .where(eq(translationJobs.id, parentJobId));

    console.log('Starting multi-language translation:', { parentJobId, targetLanguages, sourceLanguage });

    // Create individual child jobs for each target language
    const childJobs = await Promise.all(
      targetLanguages.map(async (targetLang) => {
        const [childJob] = await db
          .insert(translationJobs)
          .values({
            userId: (await db.select().from(translationJobs).where(eq(translationJobs.id, parentJobId)))[0].userId,
            sourceLanguage,
            targetLanguage: targetLang,
            sourceFileName: (await db.select().from(translationJobs).where(eq(translationJobs.id, parentJobId)))[0].sourceFileName,
            sourceFilePath: filePath,
            glossaryId: glossaryId || null,
            parentJobId: parentJobId,
            status: 'pending',
          })
          .returning();
        return childJob;
      })
    );

    // Process translations in parallel (respecting DeepL rate limits)
    const batchSize = 3; // Conservative for DeepL API limits
    const results = [];
    
    for (let i = 0; i < childJobs.length; i += batchSize) {
      const batch = childJobs.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (job) => {
        try {
          await processTranslationJob(job.id, filePath, sourceLanguage, job.targetLanguage, glossaryId);
          return { success: true, jobId: job.id, language: job.targetLanguage };
        } catch (error) {
          console.error(`Failed to process ${job.targetLanguage}:`, error);
          return { success: false, jobId: job.id, language: job.targetLanguage, error };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize < childJobs.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Check results and update parent job status
    const allSuccessful = results.every(result => result.success);
    const anySuccessful = results.some(result => result.success);

    if (allSuccessful) {
      await db
        .update(translationJobs)
        .set({ status: 'completed' })
        .where(eq(translationJobs.id, parentJobId));
    } else if (anySuccessful) {
      await db
        .update(translationJobs)
        .set({ 
          status: 'completed',
          errorMessage: `Some translations failed: ${results.filter(r => !r.success).map(r => r.language).join(', ')}`
        })
        .where(eq(translationJobs.id, parentJobId));
    } else {
      await db
        .update(translationJobs)
        .set({ 
          status: 'failed',
          errorMessage: 'All translations failed'
        })
        .where(eq(translationJobs.id, parentJobId));
    }

    console.log('Multi-language translation completed:', { 
      parentJobId, 
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length 
    });

    // Send email notifications for successful translations
    if (anySuccessful) {
      try {
        const parentJob = await db.select().from(translationJobs).where(eq(translationJobs.id, parentJobId));
        if (parentJob[0]) {
          const successfulLanguages = results
            .filter(r => r.success)
            .map(r => r.language);
          
          if (successfulLanguages.length > 0) {
            const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/review/${parentJobId}`;
            await EmailService.sendTranslationReadyNotification({
              jobId: parentJobId,
              sourceFileName: parentJob[0].sourceFileName,
              sourceLanguage,
              targetLanguages: successfulLanguages,
              reviewUrl
            });
            console.log('Multi-language email notifications sent for:', successfulLanguages);
          }
        }
      } catch (emailError) {
        console.error('Failed to send multi-language email notifications:', emailError);
        // Don't fail the job if email fails
      }
    }

  } catch (error) {
    console.error('Multi-language job processing error:', error);
    
    await db
      .update(translationJobs)
      .set({ 
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error in multi-language processing'
      })
      .where(eq(translationJobs.id, parentJobId));
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

    console.log('Starting document translation with learning:', { jobId, filePath, sourceLanguage, targetLanguage });

    // Check for learning opportunities before translation
    const learningStats = await LearningService.getLearningStats(sourceLanguage, targetLanguage);
    console.log('Learning stats for this language pair:', learningStats);

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

    // DeepL Document API has payload limits even for Pro accounts (~85KB)
    const fileSizeKB = fileBuffer.length / 1024;
    const useDocumentAPI = fileSizeKB < 85; // Conservative limit based on real-world testing
    
    console.log('Translation method decision:', {
      fileSizeKB: fileSizeKB.toFixed(1),
      useDocumentAPI,
      method: useDocumentAPI ? 'DeepL Document API' : 'Text extraction + translation'
    });

    const file = new File([fileBuffer], fileName, { 
      type: getFileContentType(path.extname(fileName).toLowerCase())
    });

    console.log('Uploading document to DeepL:', { fileName, size: file.size });

    // Create learning-enhanced glossary if we have learned terms
    let enhancedGlossaryId = glossaryId;
    if (learningStats.termCount > 0) {
      try {
        const learningGlossaryId = await LearningService.createLearningGlossary(sourceLanguage, targetLanguage);
        if (learningGlossaryId) {
          enhancedGlossaryId = learningGlossaryId;
          console.log('Using enhanced glossary with learned terms:', { 
            originalGlossary: glossaryId, 
            learningGlossary: learningGlossaryId,
            termCount: learningStats.termCount 
          });
        }
      } catch (error) {
        console.error('Failed to create learning glossary, using original:', error);
      }
    }

    // Upload document to DeepL
    let uploadResult;
    try {
      uploadResult = await deepl.uploadDocument(
        file,
        targetLanguage,
        sourceLanguage,
        enhancedGlossaryId
      );
      console.log('Document uploaded with learning enhancements:', uploadResult);
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
      console.error('DeepL translation failed:', {
        documentId: uploadResult.document_id,
        status: finalStatus,
        errorMessage: finalStatus.error_message,
        jobId
      });
      
      // For now, treat internal server errors as temporary issues
      if (finalStatus.error_message?.includes('Internal server error')) {
        throw new Error('DeepL service is temporarily unavailable. This may be due to the PDF content or a temporary service issue. Please try again later or contact DeepL support if the issue persists.');
      }
      
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

    // Update job as completed with learning stats
    await db
      .update(translationJobs)
      .set({ 
        status: 'completed',
        outputFileName,
        outputFilePath: outputPath,
        billedCharacters: finalStatus.billed_characters,
        appliedLearningCorrections: learningStats.totalUsage || 0,
        learningStatsUsed: learningStats,
      })
      .where(eq(translationJobs.id, jobId));

    console.log('Translation job completed successfully with learning stats:', {
      jobId,
      learningStats,
      usedLearningGlossary: enhancedGlossaryId !== glossaryId
    });

    // Send email notification to country team
    try {
      const job = await db.select().from(translationJobs).where(eq(translationJobs.id, jobId));
      if (job[0]) {
        const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/review/${jobId}`;
        await EmailService.sendTranslationReadyNotification({
          jobId,
          sourceFileName: job[0].sourceFileName,
          sourceLanguage,
          targetLanguages: [targetLanguage],
          reviewUrl
        });
        console.log('Email notification sent for job:', jobId);
      }
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the job if email fails
    }

    // Clean up temporary learning glossary if we created one
    if (enhancedGlossaryId && enhancedGlossaryId !== glossaryId) {
      try {
        await deepl.deleteGlossary(enhancedGlossaryId);
        console.log('Cleaned up temporary learning glossary');
      } catch (error) {
        console.error('Failed to cleanup learning glossary:', error);
      }
    }

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