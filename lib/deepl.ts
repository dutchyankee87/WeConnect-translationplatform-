const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPL_BASE_URL = 'https://api-free.deepl.com/v2';

interface TranslationResult {
  text: string;
  detected_source_language: string;
}

interface TranslationResponse {
  translations: TranslationResult[];
}

interface GlossaryLanguagePair {
  source_lang: string;
  target_lang: string;
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
}

// Export singleton instance
export const deepl = new DeepLAPI();