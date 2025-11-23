import fs from 'fs/promises';
import path from 'path';

export interface DocumentSegment {
  index: number;
  sourceText: string;
  targetText?: string;
}

export class FileProcessor {
  
  static async extractTextSegments(filePath: string): Promise<string[]> {
    const extension = path.extname(filePath).toLowerCase();
    
    switch (extension) {
      case '.txt':
        return this.extractFromTxt(filePath);
      case '.srt':
        return this.extractFromSrt(filePath);
      case '.docx':
        return this.extractFromDocx(filePath);
      case '.pdf':
        return this.extractFromPdf(filePath);
      default:
        throw new Error(`Unsupported file format: ${extension}`);
    }
  }

  private static async extractFromTxt(filePath: string): Promise<string[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Split by sentences, keeping reasonable length segments
    const sentences = content
      .split(/[.!?]+/)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 0)
      .map(sentence => sentence + '.');
    
    return sentences;
  }

  private static async extractFromSrt(filePath: string): Promise<string[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Parse SRT format and extract subtitle text
    const subtitleBlocks = content.split(/\n\s*\n/);
    const segments: string[] = [];
    
    for (const block of subtitleBlocks) {
      const lines = block.trim().split('\n');
      if (lines.length >= 3) {
        // Skip sequence number and timestamp, take text lines
        const textLines = lines.slice(2).join(' ').trim();
        if (textLines) {
          segments.push(textLines);
        }
      }
    }
    
    return segments;
  }

  private static async extractFromDocx(filePath: string): Promise<string[]> {
    // For now, implement a simple text extraction
    // In a real implementation, you'd use a library like mammoth.js
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      // This is a placeholder - in reality you'd parse the DOCX XML structure
      const sentences = content
        .replace(/<[^>]*>/g, ' ') // Remove XML tags
        .split(/[.!?]+/)
        .map(sentence => sentence.trim())
        .filter(sentence => sentence.length > 0)
        .map(sentence => sentence + '.');
      
      return sentences;
    } catch (error) {
      // Fallback: treat as plain text
      return this.extractFromTxt(filePath);
    }
  }

  private static async extractFromPdf(filePath: string): Promise<string[]> {
    // For now, implement a placeholder
    // In a real implementation, you'd use a library like pdf2pic or pdf-parse
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const sentences = content
        .split(/[.!?]+/)
        .map(sentence => sentence.trim())
        .filter(sentence => sentence.length > 0)
        .map(sentence => sentence + '.');
      
      return sentences;
    } catch (error) {
      throw new Error('PDF processing not fully implemented. Please use TXT or SRT files for now.');
    }
  }

  static async createOutputFile(
    originalPath: string,
    segments: DocumentSegment[],
    outputPath: string
  ): Promise<void> {
    const extension = path.extname(originalPath).toLowerCase();
    
    switch (extension) {
      case '.txt':
        return this.createTxtOutput(segments, outputPath);
      case '.srt':
        return this.createSrtOutput(segments, outputPath, originalPath);
      case '.docx':
        return this.createDocxOutput(segments, outputPath);
      case '.pdf':
        return this.createPdfOutput(segments, outputPath);
      default:
        throw new Error(`Unsupported output format: ${extension}`);
    }
  }

  private static async createTxtOutput(segments: DocumentSegment[], outputPath: string): Promise<void> {
    const translatedText = segments
      .map(segment => segment.targetText || segment.sourceText)
      .join(' ');
    
    await fs.writeFile(outputPath, translatedText, 'utf-8');
  }

  private static async createSrtOutput(
    segments: DocumentSegment[],
    outputPath: string,
    originalPath: string
  ): Promise<void> {
    const originalContent = await fs.readFile(originalPath, 'utf-8');
    const subtitleBlocks = originalContent.split(/\n\s*\n/);
    
    let output = '';
    let segmentIndex = 0;
    
    for (const block of subtitleBlocks) {
      const lines = block.trim().split('\n');
      if (lines.length >= 3) {
        // Keep sequence number and timestamp
        output += lines[0] + '\n';
        output += lines[1] + '\n';
        
        // Replace text with translation
        const translatedText = segments[segmentIndex]?.targetText || lines.slice(2).join('\n');
        output += translatedText + '\n\n';
        segmentIndex++;
      }
    }
    
    await fs.writeFile(outputPath, output.trim(), 'utf-8');
  }

  private static async createDocxOutput(segments: DocumentSegment[], outputPath: string): Promise<void> {
    // Placeholder: create as plain text for now
    const translatedText = segments
      .map(segment => segment.targetText || segment.sourceText)
      .join(' ');
    
    await fs.writeFile(outputPath, translatedText, 'utf-8');
  }

  private static async createPdfOutput(segments: DocumentSegment[], outputPath: string): Promise<void> {
    // Placeholder: create as plain text for now
    const translatedText = segments
      .map(segment => segment.targetText || segment.sourceText)
      .join(' ');
    
    await fs.writeFile(outputPath, translatedText, 'utf-8');
  }
}