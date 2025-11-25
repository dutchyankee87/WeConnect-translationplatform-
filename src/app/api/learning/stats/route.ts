import { NextRequest, NextResponse } from 'next/server';
import { LearningService } from '@/lib/learning';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourceLanguage = searchParams.get('sourceLanguage');
    const targetLanguage = searchParams.get('targetLanguage');

    if (!sourceLanguage || !targetLanguage) {
      return NextResponse.json({ 
        error: 'sourceLanguage and targetLanguage parameters are required' 
      }, { status: 400 });
    }

    const stats = await LearningService.getLearningStats(sourceLanguage, targetLanguage);
    
    return NextResponse.json({ 
      success: true,
      stats,
      message: `Found ${stats.termCount} learned terms and ${stats.segmentCount} learned segments`
    });

  } catch (error) {
    console.error('Error fetching learning stats:', error);
    return NextResponse.json({ 
      error: 'Internal server error while fetching learning statistics' 
    }, { status: 500 });
  }
}