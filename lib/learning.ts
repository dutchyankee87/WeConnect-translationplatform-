import { db } from '@/lib/db';
import { learnedSegments, learnedTerms } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { deepl } from '@/lib/deepl';

export interface LearnedCorrection {
  type: 'segment' | 'term';
  originalText: string;
  correctedText: string;
  confidence: number;
  usageCount: number;
}

export class LearningService {
  
  /**
   * Find exact segment matches for a given text
   */
  static async findLearnedSegment(
    sourceText: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<LearnedCorrection | null> {
    const segments = await db
      .select()
      .from(learnedSegments)
      .where(
        and(
          eq(learnedSegments.sourceText, sourceText.trim()),
          eq(learnedSegments.sourceLanguage, sourceLanguage),
          eq(learnedSegments.targetLanguage, targetLanguage)
        )
      )
      .orderBy(desc(learnedSegments.usageCount))
      .limit(1);

    if (segments.length > 0) {
      const segment = segments[0];
      return {
        type: 'segment',
        originalText: segment.sourceText,
        correctedText: segment.improvedText,
        confidence: Math.min(segment.usageCount / 3, 1), // Cap confidence at 1.0
        usageCount: segment.usageCount,
      };
    }

    return null;
  }

  /**
   * Get all learned terms for a language pair
   */
  static async getLearnedTerms(
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<Array<{ source: string; target: string; frequency: number }>> {
    const terms = await db
      .select()
      .from(learnedTerms)
      .where(
        and(
          eq(learnedTerms.sourceLanguage, sourceLanguage),
          eq(learnedTerms.targetLanguage, targetLanguage)
        )
      )
      .orderBy(desc(learnedTerms.frequency));

    return terms.map(term => ({
      source: term.sourceTerm,
      target: term.targetTerm,
      frequency: term.frequency,
    }));
  }

  /**
   * Create a temporary DeepL glossary with learned terms
   */
  static async createLearningGlossary(
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string | null> {
    const learnedTerms = await this.getLearnedTerms(sourceLanguage, targetLanguage);
    
    if (learnedTerms.length === 0) {
      return null; // No learned terms to create glossary with
    }

    // Filter out very low frequency terms (noise reduction)
    const significantTerms = learnedTerms.filter(term => term.frequency >= 1);
    
    if (significantTerms.length === 0) {
      return null;
    }

    try {
      const glossaryName = `Learned_${sourceLanguage}_${targetLanguage}_${Date.now()}`;
      const glossaryId = await deepl.createGlossary(
        glossaryName,
        sourceLanguage,
        targetLanguage,
        significantTerms.map(term => ({
          source: term.source,
          target: term.target,
        }))
      );

      console.log('Created learning glossary:', {
        glossaryId,
        termCount: significantTerms.length,
        sourceLanguage,
        targetLanguage
      });

      return glossaryId;
    } catch (error) {
      console.error('Failed to create learning glossary:', error);
      return null;
    }
  }

  /**
   * Apply learned corrections to text before translation
   */
  static async applyLearning(
    sourceText: string,
    sourceLanguage: string,
    targetLanguage: string,
    originalGlossaryId?: string
  ): Promise<{
    translatedText: string;
    appliedCorrections: LearnedCorrection[];
    glossaryUsed?: string;
  }> {
    const appliedCorrections: LearnedCorrection[] = [];
    let finalText = sourceText;

    // 1. Check for exact segment matches first
    const learnedSegment = await this.findLearnedSegment(sourceText, sourceLanguage, targetLanguage);
    if (learnedSegment) {
      console.log('Found learned segment match:', {
        original: learnedSegment.originalText,
        improved: learnedSegment.correctedText,
        confidence: learnedSegment.confidence
      });
      
      // If we have a high-confidence segment match, use it directly
      if (learnedSegment.confidence >= 0.7) {
        return {
          translatedText: learnedSegment.correctedText,
          appliedCorrections: [learnedSegment],
        };
      }
    }

    // 2. Create temporary glossary with learned terms
    const learningGlossaryId = await this.createLearningGlossary(sourceLanguage, targetLanguage);
    const glossaryToUse = learningGlossaryId || originalGlossaryId;

    // 3. Translate with enhanced glossary
    try {
      const translatedText = await deepl.translateText(
        sourceText,
        targetLanguage,
        sourceLanguage,
        glossaryToUse
      );

      // If we used a learning glossary, track that learned terms were applied
      if (learningGlossaryId) {
        const learnedTermsApplied = await this.getLearnedTerms(sourceLanguage, targetLanguage);
        learnedTermsApplied.forEach(term => {
          if (sourceText.includes(term.source)) {
            appliedCorrections.push({
              type: 'term',
              originalText: term.source,
              correctedText: term.target,
              confidence: Math.min(term.frequency / 3, 1),
              usageCount: term.frequency,
            });
          }
        });
      }

      // Clean up temporary glossary
      if (learningGlossaryId) {
        try {
          await deepl.deleteGlossary(learningGlossaryId);
        } catch (error) {
          console.error('Failed to cleanup learning glossary:', error);
        }
      }

      return {
        translatedText,
        appliedCorrections,
        glossaryUsed: glossaryToUse,
      };

    } catch (error) {
      console.error('Translation with learning failed:', error);
      
      // Fallback to regular translation
      const fallbackText = await deepl.translateText(
        sourceText,
        targetLanguage,
        sourceLanguage,
        originalGlossaryId
      );

      return {
        translatedText: fallbackText,
        appliedCorrections: [],
      };
    }
  }

  /**
   * Get learning statistics for a language pair
   */
  static async getLearningStats(
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<{
    termCount: number;
    segmentCount: number;
    totalUsage: number;
  }> {
    const [terms, segments] = await Promise.all([
      db
        .select()
        .from(learnedTerms)
        .where(
          and(
            eq(learnedTerms.sourceLanguage, sourceLanguage),
            eq(learnedTerms.targetLanguage, targetLanguage)
          )
        ),
      db
        .select()
        .from(learnedSegments)
        .where(
          and(
            eq(learnedSegments.sourceLanguage, sourceLanguage),
            eq(learnedSegments.targetLanguage, targetLanguage)
          )
        ),
    ]);

    const totalUsage = terms.reduce((sum, term) => sum + term.frequency, 0) +
                      segments.reduce((sum, segment) => sum + segment.usageCount, 0);

    return {
      termCount: terms.length,
      segmentCount: segments.length,
      totalUsage,
    };
  }
}