const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
// Use Pro API endpoint for Pro keys, Free for free keys
const DEEPL_BASE_URL = DEEPL_API_KEY?.endsWith(':fx') 
  ? 'https://api-free.deepl.com/v2' 
  : 'https://api.deepl.com/v2';

interface TranslationResult {
  text: string;
  detected_source_language: string;
}

interface TranslationResponse {
  translations: TranslationResult[];
}


interface GlossaryInfo {
  glossary_id: string;
  name: string;
  ready: boolean;
  source_lang: string;
  target_lang: string;
  creation_time: string;
  entry_count: number;
}

interface GlossariesResponse {
  glossaries: GlossaryInfo[];
}


interface DocumentUploadResponse {
  document_id: string;
  document_key: string;
}

interface DocumentStatusResponse {
  document_id: string;
  status: 'queued' | 'translating' | 'done' | 'error';
  seconds_remaining?: number;
  billed_characters?: number;
  error_message?: string;
}

export class DeepLAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    if (!DEEPL_API_KEY) {
      throw new Error('DEEPL_API_KEY environment variable is required');
    }
    this.apiKey = DEEPL_API_KEY;
    this.baseUrl = DEEPL_BASE_URL;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`DeepL API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async translateText(
    text: string, 
    targetLanguage: string, 
    sourceLanguage?: string,
    glossaryId?: string
  ): Promise<string> {
    const params = new URLSearchParams({
      text,
      target_lang: targetLanguage,
    });

    if (sourceLanguage) {
      params.append('source_lang', sourceLanguage);
    }

    if (glossaryId) {
      params.append('glossary_id', glossaryId);
    }

    const response = await this.makeRequest<TranslationResponse>('/translate', {
      method: 'POST',
      body: params.toString(),
    });

    return response.translations[0]?.text || '';
  }

  async translateSegments(
    segments: string[],
    targetLanguage: string,
    sourceLanguage?: string,
    glossaryId?: string
  ): Promise<string[]> {
    const results: string[] = [];
    
    // Process segments in batches to avoid API limits
    const batchSize = 10;
    for (let i = 0; i < segments.length; i += batchSize) {
      const batch = segments.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(segment => 
          this.translateText(segment, targetLanguage, sourceLanguage, glossaryId)
        )
      );
      results.push(...batchResults);
    }

    return results;
  }

  async createGlossary(
    name: string,
    sourceLanguage: string,
    targetLanguage: string,
    entries: Array<{ source: string; target: string }>
  ): Promise<string> {
    const entriesText = entries
      .map(entry => `${entry.source}\t${entry.target}`)
      .join('\n');

    const params = new URLSearchParams({
      name,
      source_lang: sourceLanguage,
      target_lang: targetLanguage,
      entries: entriesText,
      entries_format: 'tsv',
    });

    const response = await this.makeRequest<GlossaryInfo>('/glossaries', {
      method: 'POST',
      body: params.toString(),
    });

    return response.glossary_id;
  }

  async getGlossaries(): Promise<GlossaryInfo[]> {
    const response = await this.makeRequest<GlossariesResponse>('/glossaries', {
      method: 'GET',
    });
    return response.glossaries;
  }

  async deleteGlossary(glossaryId: string): Promise<void> {
    await this.makeRequest(`/glossaries/${glossaryId}`, {
      method: 'DELETE',
    });
  }

  async getGlossary(glossaryId: string): Promise<GlossaryInfo> {
    return this.makeRequest<GlossaryInfo>(`/glossaries/${glossaryId}`, {
      method: 'GET',
    });
  }

  async getGlossaryEntries(glossaryId: string): Promise<Array<{ source: string; target: string }>> {
    const response = await fetch(`${this.baseUrl}/glossaries/${glossaryId}/entries`, {
      headers: {
        'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
        'Accept': 'text/tab-separated-values',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch glossary entries: ${response.status}`);
    }

    const tsvData = await response.text();
    const entries = tsvData
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [source, target] = line.split('\t');
        return { source: source?.trim() || '', target: target?.trim() || '' };
      })
      .filter(entry => entry.source && entry.target);

    return entries;
  }

  async getSupportedLanguages(): Promise<Array<{ language: string; name: string }>> {
    const response = await this.makeRequest<{ languages: Array<{ language: string; name: string }> }>(
      '/languages',
      { method: 'GET' }
    );
    return response.languages;
  }

  /**
   * Check if file size is within DeepL limits
   * @param file File to check
   * @returns true if file is within limits
   */
  private validateFileSize(file: File): boolean {
    // Pro accounts: 30MB for PDF/DOCX/PPTX, Free accounts: 10MB for PDF/DOCX
    const isProAccount = !this.apiKey.endsWith(':fx');
    const fileExt = file.name.toLowerCase();
    
    let MAX_FILE_SIZE;
    if (isProAccount) {
      if (fileExt.endsWith('.pdf') || fileExt.endsWith('.docx') || fileExt.endsWith('.pptx') || fileExt.endsWith('.xlsx')) {
        MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB for Pro
      } else {
        MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB for other formats
      }
    } else {
      if (fileExt.endsWith('.pdf') || fileExt.endsWith('.docx') || fileExt.endsWith('.pptx') || fileExt.endsWith('.xlsx')) {
        MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB for Free
      } else {
        MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB for other formats
      }
    }
    
    return file.size <= MAX_FILE_SIZE;
  }

  /**
   * Upload a document for translation using DeepL's Document API
   * @param file File to translate
   * @param targetLanguage Target language code
   * @param sourceLanguage Source language code (optional)
   * @param glossaryId Glossary ID (optional)
   * @param outputFormat Output format (optional, for format conversion)
   * @returns Document ID and key for status checking
   */
  async uploadDocument(
    file: File,
    targetLanguage: string,
    sourceLanguage?: string,
    glossaryId?: string,
    outputFormat?: string
  ): Promise<DocumentUploadResponse> {
    // Validate file size before upload
    if (!this.validateFileSize(file)) {
      const isProAccount = !this.apiKey.endsWith(':fx');
      const fileExt = file.name.toLowerCase();
      const isPDFDOCX = fileExt.endsWith('.pdf') || fileExt.endsWith('.docx') || fileExt.endsWith('.pptx') || fileExt.endsWith('.xlsx');
      
      let limit;
      if (isProAccount) {
        limit = isPDFDOCX ? '30MB' : '5MB';
      } else {
        limit = isPDFDOCX ? '10MB' : '1MB';
      }
      
      const accountType = isProAccount ? 'Pro' : 'Free';
      throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds DeepL's ${accountType} tier limit of ${limit} for ${fileExt} files. Please use a smaller file.`);
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_lang', targetLanguage);
    
    if (sourceLanguage) {
      formData.append('source_lang', sourceLanguage);
    }
    
    if (glossaryId) {
      formData.append('glossary_id', glossaryId);
    }
    
    if (outputFormat) {
      formData.append('output_format', outputFormat);
    }

    console.log('DeepL API request details:', {
      url: `${this.baseUrl}/document`,
      fileName: file.name,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      targetLang: targetLanguage,
      sourceLang: sourceLanguage,
      glossaryId: glossaryId || 'none',
      apiKeyPrefix: this.apiKey.substring(0, 8) + '...'
    });

    const response = await fetch(`${this.baseUrl}/document`, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
      },
      body: formData,
    });

    console.log('DeepL API response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepL API error details:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText
      });
      throw new Error(`DeepL Document API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Check the translation status of a document
   * @param documentId Document ID from upload
   * @param documentKey Document key from upload
   * @returns Current translation status
   */
  async getDocumentStatus(
    documentId: string,
    documentKey: string
  ): Promise<DocumentStatusResponse> {
    const params = new URLSearchParams({
      document_key: documentKey
    });

    const response = await this.makeRequest<DocumentStatusResponse>(
      `/document/${documentId}?${params.toString()}`,
      { method: 'GET' }
    );

    return response;
  }

  /**
   * Download the translated document
   * @param documentId Document ID
   * @param documentKey Document key
   * @returns Blob containing the translated document
   */
  async downloadDocument(
    documentId: string,
    documentKey: string
  ): Promise<Blob> {
    const params = new URLSearchParams({
      document_key: documentKey
    });

    const response = await fetch(`${this.baseUrl}/document/${documentId}/result?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to download document: ${response.status} - ${errorText}`);
    }

    return response.blob();
  }

  /**
   * Poll document status until completion
   * @param documentId Document ID
   * @param documentKey Document key
   * @param onProgress Callback for progress updates
   * @returns Final document status
   */
  async waitForDocumentCompletion(
    documentId: string,
    documentKey: string,
    onProgress?: (status: DocumentStatusResponse) => void
  ): Promise<DocumentStatusResponse> {
    const maxAttempts = 60; // 5 minutes max
    const pollInterval = 5000; // 5 seconds
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const status = await this.getDocumentStatus(documentId, documentKey);
      
      if (onProgress) {
        onProgress(status);
      }
      
      if (status.status === 'done' || status.status === 'error') {
        return status;
      }
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error('Document translation timeout');
  }

  /**
   * Translate multiple documents concurrently with rate limiting
   * @param files Array of files to translate
   * @param targetLanguage Target language
   * @param sourceLanguage Source language (optional)
   * @param glossaryId Glossary ID (optional)
   * @param outputFormats Output formats for each file (optional)
   * @param onProgress Progress callback
   * @returns Array of translation results
   */
  async translateDocumentsBatch(
    files: File[],
    targetLanguage: string,
    sourceLanguage?: string,
    glossaryId?: string,
    outputFormats?: string[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<Array<{ file: File; documentId: string; documentKey: string; status: string; blob?: Blob; error?: string }>> {
    const results: Array<{ file: File; documentId: string; documentKey: string; status: string; blob?: Blob; error?: string }> = [];
    const concurrentLimit = 8; // Safe concurrent limit based on research
    
    // Process files in batches to avoid rate limits
    for (let i = 0; i < files.length; i += concurrentLimit) {
      const batch = files.slice(i, i + concurrentLimit);
      
      const batchPromises = batch.map(async (file, index) => {
        const globalIndex = i + index;
        const outputFormat = outputFormats?.[globalIndex];
        
        try {
          // Upload document
          const uploadResult = await this.uploadDocument(
            file,
            targetLanguage,
            sourceLanguage,
            glossaryId,
            outputFormat
          );
          
          // Wait for completion
          const finalStatus = await this.waitForDocumentCompletion(
            uploadResult.document_id,
            uploadResult.document_key,
            () => {
              // Update progress for this file
              if (onProgress) {
                const completed = results.filter(r => r.status === 'done').length;
                onProgress(completed, files.length);
              }
            }
          );
          
          let blob: Blob | undefined;
          if (finalStatus.status === 'done') {
            blob = await this.downloadDocument(
              uploadResult.document_id,
              uploadResult.document_key
            );
          }
          
          return {
            file,
            documentId: uploadResult.document_id,
            documentKey: uploadResult.document_key,
            status: finalStatus.status,
            blob,
            error: finalStatus.error_message
          };
          
        } catch (error) {
          return {
            file,
            documentId: '',
            documentKey: '',
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Update overall progress
      if (onProgress) {
        const completed = results.filter(r => r.status === 'done').length;
        onProgress(completed, files.length);
      }
      
      // Small delay between batches to be respectful to the API
      if (i + concurrentLimit < files.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
}

// Export singleton instance
export const deepl = new DeepLAPI();