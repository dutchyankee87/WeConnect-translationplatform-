import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { translationJobs, users, batchJobs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { deepl } from '@/lib/deepl';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sourceLanguage = formData.get('sourceLanguage') as string;
    const targetLanguage = formData.get('targetLanguage') as string;
    const batchJobId = formData.get('batchJobId') as string;
    const glossaryId = formData.get('glossaryId') as string | null;
    const outputFormat = formData.get('outputFormat') as string | null;

    // Validate required fields
    if (!file || !sourceLanguage || !targetLanguage || !batchJobId) {
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

    // Verify batch job exists and belongs to user
    const batchJob = await db
      .select()
      .from(batchJobs)
      .where(eq(batchJobs.id, batchJobId))
      .limit(1);

    if (batchJob.length === 0 || batchJob[0].userId !== user[0].id) {
      return NextResponse.json(
        { success: false, error: 'Batch job not found or access denied' },
        { status: 404 }
      );
    }

    // Create job record first
    const [job] = await db
      .insert(translationJobs)
      .values({
        userId: user[0].id,
        batchJobId,
        sourceLanguage,
        targetLanguage,
        sourceFileName: file.name,
        sourceFilePath: '', // Will be updated after file save
        sourceFileFormat: path.extname(file.name),
        outputFileFormat: outputFormat || path.extname(file.name),
        glossaryId: glossaryId || null,
        status: 'processing',
      })
      .returning();

    try {
      // Save uploaded file
      const timestamp = Date.now();
      const safeFileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const uploadPath = path.join(UPLOAD_DIR, 'batch', batchJobId);
      const filePath = path.join(uploadPath, safeFileName);

      // Ensure directory exists
      await mkdir(uploadPath, { recursive: true });

      // Save file
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      // Update job with file path
      await db
        .update(translationJobs)
        .set({ sourceFilePath: filePath })
        .where(eq(translationJobs.id, job.id));

      // Convert File object for DeepL API
      const fileBlob = new Blob([buffer], { type: file.type });
      const deeplFile = new File([fileBlob], file.name, { type: file.type });

      // Use DeepL Document API for translation
      const uploadResult = await deepl.uploadDocument(
        deeplFile,
        targetLanguage,
        sourceLanguage,
        glossaryId || undefined,
        outputFormat || undefined
      );

      // Update job with DeepL document info
      await db
        .update(translationJobs)
        .set({
          deeplDocumentId: uploadResult.document_id,
          deeplDocumentKey: uploadResult.document_key,
        })
        .where(eq(translationJobs.id, job.id));

      // Wait for translation completion
      const finalStatus = await deepl.waitForDocumentCompletion(
        uploadResult.document_id,
        uploadResult.document_key
      );

      if (finalStatus.status === 'done') {
        // Download translated document
        const translatedBlob = await deepl.downloadDocument(
          uploadResult.document_id,
          uploadResult.document_key
        );

        // Save translated file
        const outputExtension = outputFormat || path.extname(file.name);
        const outputFileName = file.name.replace(/\.[^/.]+$/, `_translated${outputExtension}`);
        const outputPath = path.join(uploadPath, outputFileName);
        
        const translatedBuffer = Buffer.from(await translatedBlob.arrayBuffer());
        await writeFile(outputPath, translatedBuffer);

        // Update job as completed
        await db
          .update(translationJobs)
          .set({
            status: 'completed',
            outputFileName,
            outputFilePath: outputPath,
            billedCharacters: finalStatus.billed_characters,
          })
          .where(eq(translationJobs.id, job.id));

        // Update batch job progress
        await db
          .update(batchJobs)
          .set({
            completedFiles: batchJob[0].completedFiles + 1,
          })
          .where(eq(batchJobs.id, batchJobId));

        // Check if batch is complete
        const updatedBatch = await db
          .select()
          .from(batchJobs)
          .where(eq(batchJobs.id, batchJobId))
          .limit(1);

        if (updatedBatch[0].completedFiles + updatedBatch[0].failedFiles >= updatedBatch[0].totalFiles) {
          await db
            .update(batchJobs)
            .set({
              status: 'completed',
              completedAt: new Date(),
            })
            .where(eq(batchJobs.id, batchJobId));
        }

        return NextResponse.json({
          success: true,
          job: {
            id: job.id,
            status: 'completed',
            outputFilePath: outputPath,
            billedCharacters: finalStatus.billed_characters,
          },
        });

      } else {
        // Translation failed
        const errorMessage = finalStatus.error_message || 'Translation failed';
        
        await db
          .update(translationJobs)
          .set({
            status: 'failed',
            errorMessage,
          })
          .where(eq(translationJobs.id, job.id));

        // Update batch job failed count
        await db
          .update(batchJobs)
          .set({
            failedFiles: batchJob[0].failedFiles + 1,
          })
          .where(eq(batchJobs.id, batchJobId));

        return NextResponse.json({
          success: false,
          error: errorMessage,
        });
      }

    } catch (translationError) {
      console.error('Translation error:', translationError);
      
      // Mark job as failed
      await db
        .update(translationJobs)
        .set({
          status: 'failed',
          errorMessage: translationError instanceof Error ? translationError.message : 'Unknown error',
        })
        .where(eq(translationJobs.id, job.id));

      // Update batch job failed count
      await db
        .update(batchJobs)
        .set({
          failedFiles: batchJob[0].failedFiles + 1,
        })
        .where(eq(batchJobs.id, batchJobId));

      return NextResponse.json({
        success: false,
        error: translationError instanceof Error ? translationError.message : 'Translation failed',
      });
    }

  } catch (error) {
    console.error('Batch translation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}