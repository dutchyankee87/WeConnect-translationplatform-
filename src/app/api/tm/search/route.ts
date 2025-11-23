import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { translationMemory } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/user';
import { eq, and, sql } from 'drizzle-orm';

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

    const body = await request.json();
    const { sourceSegment, sourceLanguage, targetLanguage } = body;

    if (!sourceSegment || !sourceLanguage || !targetLanguage) {
      return NextResponse.json(
        { error: 'Source segment, source language, and target language are required' },
        { status: 400 }
      );
    }

    // Search for exact matches first
    const exactMatches = await db
      .select()
      .from(translationMemory)
      .where(and(
        eq(translationMemory.sourceSegment, sourceSegment),
        eq(translationMemory.sourceLanguage, sourceLanguage),
        eq(translationMemory.targetLanguage, targetLanguage)
      ))
      .limit(5);

    // Search for fuzzy matches using PostgreSQL similarity
    // Note: This requires the pg_trgm extension in PostgreSQL
    const fuzzyMatches = await db
      .select({
        sourceSegment: translationMemory.sourceSegment,
        targetSegment: translationMemory.targetSegment,
        similarity: sql<number>`similarity(${translationMemory.sourceSegment}, ${sourceSegment})`,
      })
      .from(translationMemory)
      .where(and(
        eq(translationMemory.sourceLanguage, sourceLanguage),
        eq(translationMemory.targetLanguage, targetLanguage),
        sql`similarity(${translationMemory.sourceSegment}, ${sourceSegment}) > 0.3`
      ))
      .orderBy(sql`similarity(${translationMemory.sourceSegment}, ${sourceSegment}) DESC`)
      .limit(10);

    // Combine and format suggestions
    const suggestions = [];

    // Add exact matches with 100% similarity
    for (const match of exactMatches) {
      suggestions.push({
        sourceText: match.sourceSegment,
        targetText: match.targetSegment,
        similarity: 1.0,
        type: 'exact',
      });
    }

    // Add fuzzy matches (exclude any that are already exact matches)
    for (const match of fuzzyMatches) {
      if (!exactMatches.find(em => em.sourceSegment === match.sourceSegment)) {
        suggestions.push({
          sourceText: match.sourceSegment,
          targetText: match.targetSegment,
          similarity: match.similarity || 0,
          type: 'fuzzy',
        });
      }
    }

    // Sort by similarity (highest first) and limit results
    const sortedSuggestions = suggestions
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    return NextResponse.json({ 
      success: true, 
      suggestions: sortedSuggestions,
      count: sortedSuggestions.length
    });
  } catch (error) {
    console.error('TM search error:', error);
    
    // Fallback for databases without pg_trgm extension
    if (error instanceof Error && error.message.includes('similarity')) {
      try {
        // Simple fallback: search for segments containing keywords
        const keywords = request.body.sourceSegment.toLowerCase().split(' ').filter(word => word.length > 3);
        
        if (keywords.length > 0) {
          const keywordMatches = await db
            .select()
            .from(translationMemory)
            .where(and(
              eq(translationMemory.sourceLanguage, request.body.sourceLanguage),
              eq(translationMemory.targetLanguage, request.body.targetLanguage)
            ))
            .limit(10);

          const filteredMatches = keywordMatches
            .filter(match => {
              const matchText = match.sourceSegment.toLowerCase();
              return keywords.some(keyword => matchText.includes(keyword));
            })
            .map(match => ({
              sourceText: match.sourceSegment,
              targetText: match.targetSegment,
              similarity: 0.5, // Default similarity for keyword matches
              type: 'keyword',
            }))
            .slice(0, 5);

          return NextResponse.json({ 
            success: true, 
            suggestions: filteredMatches,
            count: filteredMatches.length
          });
        }
      } catch (fallbackError) {
        console.error('TM search fallback error:', fallbackError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      suggestions: [],
      count: 0
    });
  }
}