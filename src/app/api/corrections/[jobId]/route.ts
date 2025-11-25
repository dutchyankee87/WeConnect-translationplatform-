import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { translationCorrections } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json({ 
        error: 'Job ID is required' 
      }, { status: 400 });
    }

    // Get all corrections for this job
    const corrections = await db
      .select()
      .from(translationCorrections)
      .where(eq(translationCorrections.jobId, jobId))
      .orderBy(desc(translationCorrections.createdAt));

    // Group by country for better display
    const correctionsByCountry = corrections.reduce((acc, correction) => {
      if (!acc[correction.countryCode]) {
        acc[correction.countryCode] = [];
      }
      acc[correction.countryCode].push(correction);
      return acc;
    }, {} as Record<string, typeof corrections>);

    return NextResponse.json({ 
      success: true, 
      corrections,
      correctionsByCountry,
      totalCorrections: corrections.length,
      countries: Object.keys(correctionsByCountry)
    });

  } catch (error) {
    console.error('Error fetching corrections:', error);
    return NextResponse.json({ 
      error: 'Internal server error while fetching corrections' 
    }, { status: 500 });
  }
}