export interface QAWarning {
  segmentIndex: number;
  sourceText: string;
  targetText: string;
  type: 'glossary' | 'number' | 'formatting';
  severity: 'low' | 'medium' | 'high';
  message: string;
  suggestion?: string;
}

export interface GlossaryWarning {
  segment: string;
  sourceTerm: string;
  targetTerm: string;
  message: string;
  segmentIndex: number;
}

export interface NumberWarning {
  segment: string;
  sourceNumbers: string[];
  targetNumbers: string[];
  message: string;
  segmentIndex: number;
}

export interface QAResult {
  glossaryWarnings: GlossaryWarning[];
  numberWarnings: NumberWarning[];
  qualityScore: number;
  totalWarnings: number;
}

export class QAChecker {
  
  static async performQA(
    segments: Array<{ sourceText: string; targetText: string }>,
    glossaryEntries?: Array<{ sourceTerm: string; targetTerm: string }>
  ): Promise<QAResult> {
    const glossaryWarnings: GlossaryWarning[] = [];
    const numberWarnings: NumberWarning[] = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      // Skip if no target text
      if (!segment.targetText) continue;

      // Check glossary compliance
      if (glossaryEntries && glossaryEntries.length > 0) {
        const glossaryIssues = this.checkGlossaryCompliance(
          segment.sourceText, 
          segment.targetText, 
          glossaryEntries,
          i
        );
        glossaryWarnings.push(...glossaryIssues);
      }

      // Check number consistency
      const numberIssues = this.checkNumberConsistency(
        segment.sourceText, 
        segment.targetText,
        i
      );
      numberWarnings.push(...numberIssues);
    }

    // Calculate quality score
    const qualityScore = this.calculateQualityScore(glossaryWarnings, numberWarnings);

    return {
      glossaryWarnings,
      numberWarnings,
      qualityScore,
      totalWarnings: glossaryWarnings.length + numberWarnings.length,
    };
  }

  private static checkGlossaryCompliance(
    sourceText: string,
    targetText: string,
    glossaryEntries: Array<{ sourceTerm: string; targetTerm: string }>,
    segmentIndex: number
  ): GlossaryWarning[] {
    const warnings: GlossaryWarning[] = [];

    for (const entry of glossaryEntries) {
      const sourceTermLower = entry.sourceTerm.toLowerCase();
      const targetTermLower = entry.targetTerm.toLowerCase();
      
      // Check if source term appears in source text (case-insensitive)
      const sourceHasTerm = sourceText.toLowerCase().includes(sourceTermLower);
      
      if (sourceHasTerm) {
        // Check if corresponding target term appears in target text
        const targetHasTerm = targetText.toLowerCase().includes(targetTermLower);
        
        if (!targetHasTerm) {
          warnings.push({
            segment: sourceText,
            sourceTerm: entry.sourceTerm,
            targetTerm: entry.targetTerm,
            message: `Source contains "${entry.sourceTerm}" but target text doesn't contain the expected translation "${entry.targetTerm}".`,
            segmentIndex,
          });
        }
      }
    }

    return warnings;
  }

  private static checkNumberConsistency(
    sourceText: string,
    targetText: string,
    segmentIndex: number
  ): NumberWarning[] {
    const warnings: NumberWarning[] = [];

    // Extract numbers from both texts
    const sourceNumbers = this.extractNumbers(sourceText);
    const targetNumbers = this.extractNumbers(targetText);

    // Compare numbers
    if (sourceNumbers.length !== targetNumbers.length) {
      warnings.push({
        segment: sourceText,
        sourceNumbers,
        targetNumbers,
        message: `Number count mismatch: source has ${sourceNumbers.length} numbers, target has ${targetNumbers.length}.`,
        segmentIndex,
      });
    } else {
      // Check if numbers match (allowing for different formatting)
      for (let i = 0; i < sourceNumbers.length; i++) {
        const sourceNum = this.normalizeNumber(sourceNumbers[i]);
        const targetNum = this.normalizeNumber(targetNumbers[i]);
        
        if (sourceNum !== targetNum) {
          warnings.push({
            segment: sourceText,
            sourceNumbers,
            targetNumbers,
            message: `Number value mismatch: "${sourceNumbers[i]}" in source vs "${targetNumbers[i]}" in target.`,
            segmentIndex,
          });
        }
      }
    }

    return warnings;
  }

  private static extractNumbers(text: string): string[] {
    // Regular expression to match various number formats
    // Matches integers, decimals, percentages, currency, etc.
    const numberRegex = /\b\d+(?:[.,]\d+)*(?:\s*%|\s*\$|\s*€|\s*£|\s*¥)?\b/g;
    return text.match(numberRegex) || [];
  }

  private static normalizeNumber(numStr: string): string {
    // Remove currency symbols and percentage signs for comparison
    return numStr.replace(/[%$€£¥,\s]/g, '').replace(/\./g, '');
  }

  private static calculateQualityScore(
    glossaryWarnings: GlossaryWarning[],
    numberWarnings: NumberWarning[]
  ): number {
    let score = 100;

    // Deduct points for each type of warning
    score -= glossaryWarnings.length * 10; // 10 points per glossary warning
    score -= numberWarnings.length * 15;   // 15 points per number warning

    // Ensure score doesn't go below 0
    return Math.max(0, score);
  }

  static formatWarningMessage(warning: QAWarning): string {
    switch (warning.type) {
      case 'glossary':
        return `Glossary term "${warning.message}" not found in target text.`;
      case 'number':
        return `Number inconsistency: ${warning.message}`;
      default:
        return warning.message;
    }
  }

  static getWarningColor(severity: 'low' | 'medium' | 'high'): string {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}

export default QAChecker;