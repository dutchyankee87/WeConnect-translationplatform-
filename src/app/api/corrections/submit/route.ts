import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { translationCorrections, learnedSegments, learnedTerms, translationJobs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { EmailService } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, targetLanguage, countryCode, submittedBy, corrections } = body;

    // Validate required fields
    if (!jobId || !targetLanguage || !countryCode || !submittedBy || !corrections || corrections.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields: jobId, targetLanguage, countryCode, submittedBy, and corrections are required' 
      }, { status: 400 });
    }

    // Validate email format (basic)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(submittedBy)) {
      return NextResponse.json({ 
        error: 'Invalid email format' 
      }, { status: 400 });
    }

    // Validate correction format
    for (const correction of corrections) {
      if (!correction.originalText || !correction.correctedText || !correction.type) {
        return NextResponse.json({ 
          error: 'Each correction must have originalText, correctedText, and type' 
        }, { status: 400 });
      }
      
      if (!['terminology', 'phrasing'].includes(correction.type)) {
        return NextResponse.json({ 
          error: 'Correction type must be either "terminology" or "phrasing"' 
        }, { status: 400 });
      }
    }

    // Get source language from job to store in learning tables
    const jobQuery = await db
      .select({ sourceLanguage: translationJobs.sourceLanguage })
      .from(translationJobs)
      .where(eq(translationJobs.id, jobId))
      .limit(1);

    if (jobQuery.length === 0) {
      return NextResponse.json({ 
        error: 'Translation job not found' 
      }, { status: 404 });
    }

    const sourceLanguage = jobQuery[0].sourceLanguage;

    // Insert corrections into database AND store in learning tables
    const insertedCorrections = [];
    
    for (const correction of corrections) {
      // 1. Store the correction record
      const [inserted] = await db
        .insert(translationCorrections)
        .values({
          jobId,
          targetLanguage,
          countryCode,
          originalText: correction.originalText,
          correctedText: correction.correctedText,
          correctionType: correction.type,
          submittedBy,
          isApproved: 'true', // Auto-approve for now, can be changed later
        })
        .returning();
      
      insertedCorrections.push(inserted);

      // 2. Store in learning tables based on correction type
      if (correction.type === 'terminology') {
        // Extract terms for terminology corrections (simple word extraction)
        const sourceTerms = correction.originalText.split(/\s+/);
        const targetTerms = correction.correctedText.split(/\s+/);
        
        // For terminology, we assume it's often single terms or phrases
        // Store the most significant term (longest or last word for simplicity)
        const sourceTerm = sourceTerms.length === 1 ? sourceTerms[0] : correction.originalText.trim();
        const targetTerm = targetTerms.length === 1 ? targetTerms[0] : correction.correctedText.trim();
        
        // Check if this term already exists
        const existingTerm = await db
          .select()
          .from(learnedTerms)
          .where(
            and(
              eq(learnedTerms.sourceTerm, sourceTerm),
              eq(learnedTerms.sourceLanguage, sourceLanguage),
              eq(learnedTerms.targetLanguage, targetLanguage)
            )
          )
          .limit(1);

        if (existingTerm.length === 0) {
          // Add new learned term
          await db.insert(learnedTerms).values({
            sourceTerm,
            targetTerm,
            sourceLanguage,
            targetLanguage,
            frequency: 1,
          });
        } else {
          // Increment frequency
          await db
            .update(learnedTerms)
            .set({ 
              frequency: existingTerm[0].frequency + 1,
              targetTerm // Update with latest correction
            })
            .where(eq(learnedTerms.id, existingTerm[0].id));
        }
      } else if (correction.type === 'phrasing') {
        // Store complete segments for phrasing corrections
        // Check if this segment already exists
        const existingSegment = await db
          .select()
          .from(learnedSegments)
          .where(
            and(
              eq(learnedSegments.sourceText, correction.originalText),
              eq(learnedSegments.sourceLanguage, sourceLanguage),
              eq(learnedSegments.targetLanguage, targetLanguage)
            )
          )
          .limit(1);

        if (existingSegment.length === 0) {
          // Add new learned segment
          await db.insert(learnedSegments).values({
            sourceText: correction.originalText,
            targetText: correction.originalText, // Original translation (we don't have it, so use source)
            improvedText: correction.correctedText,
            sourceLanguage,
            targetLanguage,
            usageCount: 1,
          });
        } else {
          // Update existing segment
          await db
            .update(learnedSegments)
            .set({ 
              usageCount: existingSegment[0].usageCount + 1,
              improvedText: correction.correctedText, // Update with latest correction
              lastUsed: new Date()
            })
            .where(eq(learnedSegments.id, existingSegment[0].id));
        }
      }
    }

    console.log('Corrections submitted successfully:', {
      jobId,
      targetLanguage,
      countryCode,
      submittedBy,
      correctionCount: corrections.length
    });

    // Send confirmation email to submitter
    try {
      const job = await db.select().from(translationJobs).where(eq(translationJobs.id, jobId));
      if (job[0]) {
        await EmailService.sendCorrectionSubmittedConfirmation({
          submitterEmail: submittedBy,
          jobId,
          targetLanguage,
          correctionCount: corrections.length,
          sourceFileName: job[0].sourceFileName
        });
        console.log('Correction confirmation email sent to:', submittedBy);
      }
    } catch (emailError) {
      console.error('Failed to send correction confirmation email:', emailError);
      // Don't fail the submission if email fails
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully submitted ${corrections.length} corrections`,
      corrections: insertedCorrections 
    });

  } catch (error) {
    console.error('Correction submission error:', error);
    return NextResponse.json({ 
      error: 'Internal server error while submitting corrections' 
    }, { status: 500 });
  }
}

// GET endpoint to retrieve corrections for a job (optional, for viewing previous corrections)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const targetLanguage = searchParams.get('targetLanguage');

    if (!jobId) {
      return NextResponse.json({ 
        error: 'jobId parameter is required' 
      }, { status: 400 });
    }

    // Build query
    let query = db.select().from(translationCorrections).where(eq(translationCorrections.jobId, jobId));
    
    if (targetLanguage) {
      query = query.where(eq(translationCorrections.targetLanguage, targetLanguage));
    }

    const corrections = await query;

    return NextResponse.json({ 
      success: true, 
      corrections 
    });

  } catch (error) {
    console.error('Correction fetch error:', error);
    return NextResponse.json({ 
      error: 'Internal server error while fetching corrections' 
    }, { status: 500 });
  }
}