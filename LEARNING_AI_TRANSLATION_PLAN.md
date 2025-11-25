# Learning Translation Platform - Simplified Implementation Plan

## Overview

This document outlines the implementation plan for a **translation tool that gets smarter with every project** and automatically reuses country corrections in future jobs. 

**Core Value Proposition**: Solve Quooker's biggest pain point by building a translation memory system that learns from country feedback and automatically applies improvements to future translations.

## Simplified System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Upload Document │ -> │ Select Multiple  │ -> │ Parallel DeepL  │
│                 │    │ Target Languages │    │ Translations    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                v                        v
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Country Reviews │ -> │ Simple Learning  │ -> │ Auto-Apply to   │
│ & Corrections   │    │ Memory Storage   │    │ Future Jobs     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Core Requirements (Simplified)

1. **Multi-Language Workflow**: Upload one document → select multiple languages → parallel processing
2. **Simple Learning Loop**: Country corrects → System remembers → Auto-applies to future translations
3. **Intuitive Feedback Portal**: Side-by-side review with inline editing

## Simplified Database Schema

### 1. Multi-Language Jobs (Extends existing schema)

```sql
-- Add to existing translation_jobs table
ALTER TABLE translation_jobs ADD COLUMN target_languages json[]; // ["nl", "de", "fr"]
ALTER TABLE translation_jobs ADD COLUMN is_multi_language boolean DEFAULT false;
ALTER TABLE translation_jobs ADD COLUMN parent_job_id uuid; // for individual language jobs
```

### 2. Simple Correction Storage

```sql
-- Store country corrections for learning
translation_corrections {
  id: uuid,
  job_id: uuid,
  target_language: varchar,
  country_code: varchar, // "nl", "de", "fr" 
  original_text: text,
  corrected_text: text,
  correction_type: enum, // "terminology", "phrasing"
  submitted_by: varchar,
  is_approved: boolean DEFAULT true,
  created_at: timestamp
}
```

### 3. Learning Memory (Simple)

```sql
-- Lightweight translation memory with corrections
learned_segments {
  id: uuid,
  source_text: text,
  target_text: text, // original DeepL translation
  improved_text: text, // country correction
  source_language: varchar,
  target_language: varchar,
  usage_count: integer DEFAULT 1,
  last_used: timestamp,
  created_at: timestamp
}

-- Simple glossary additions from corrections
learned_terms {
  id: uuid,
  source_term: text,
  target_term: text, // corrected version
  source_language: varchar,
  target_language: varchar,
  frequency: integer DEFAULT 1,
  created_at: timestamp
}
```

## Simple Feedback Portal

### Core Features (MVP)

**1. Super Simple Review Interface**
- **Side-by-Side View**: Original document | Translated document
- **Direct Inline Editing**: Click any text to edit immediately
- **Two-Button Categorization**: "Terminology" or "Phrasing" 
- **Batch Submit**: Submit all corrections at once
- **Previous Corrections View**: See what the system has learned

**2. Streamlined API**
```typescript
// API endpoint: /api/corrections/submit
{
  jobId: string,
  targetLanguage: string,
  countryCode: string,
  corrections: [
    {
      originalText: string,
      correctedText: string,
      type: "terminology" | "phrasing"
    }
  ]
}
```

**3. Basic Notification**
- **Email Alert**: "Your translation is ready for review"
- **Simple Status**: "Pending Review" | "Completed"

## Multi-Language Workflow (Core Feature)

### Simple Upload & Processing

**1. Enhanced Upload Form**
```typescript
// Simple multi-language form
{
  file: File,
  sourceLanguage: string,
  targetLanguages: string[], // ["nl", "de", "fr", "es"]
  glossaryId?: string
}
```

**2. Parallel Processing with Learning**
```typescript
async function processMultiLanguageJob(jobId: string) {
  // 1. Check learned segments before translation
  const learnedSegments = await getLearnedSegments(sourceLanguage, targetLanguages);
  
  // 2. Create DeepL jobs with learned improvements
  for (const targetLang of targetLanguages) {
    const improvedGlossary = await createGlossaryWithLearnedTerms(targetLang);
    await processDeepLTranslation(jobId, targetLang, improvedGlossary);
  }
  
  // 3. Apply learned segments post-translation
  await applyLearnedSegments(jobId, learnedSegments);
}
```

**3. Simple Progress Tracking**
```
Translating: document.pdf → 4 languages
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 75% (3/4)

✅ Dutch (NL)     - Done (2 learned corrections applied)
✅ German (DE)    - Done (1 learned correction applied) 
✅ French (FR)    - Done (0 learned corrections)
🔄 Spanish (ES)   - Processing...
```

## Simple Learning Memory System

### Core Learning Loop (No Complex ML)

**1. Store Corrections**
```typescript
async function storeCorrection(correction) {
  if (correction.type === 'terminology') {
    // Add to learned terms
    await db.insert(learned_terms).values({
      sourceTerm: correction.originalText,
      targetTerm: correction.correctedText,
      sourceLanguage: correction.sourceLanguage,
      targetLanguage: correction.targetLanguage
    });
  } else {
    // Add to learned segments
    await db.insert(learned_segments).values({
      sourceText: correction.originalText,
      improvedText: correction.correctedText,
      sourceLanguage: correction.sourceLanguage,
      targetLanguage: correction.targetLanguage
    });
  }
}
```

**2. Apply Learning Before Translation**
```typescript
async function applyLearning(sourceText: string, targetLanguage: string) {
  // 1. Check for exact segment matches (simple string matching)
  const learnedSegment = await findLearnedSegment(sourceText, targetLanguage);
  if (learnedSegment) {
    return learnedSegment.improvedText;
  }
  
  // 2. Create temporary glossary from learned terms
  const learnedTerms = await getLearnedTerms(targetLanguage);
  const tempGlossary = await createTempGlossary(learnedTerms);
  
  // 3. Translate with DeepL using temp glossary
  return await deepl.translateText(sourceText, targetLanguage, null, tempGlossary.id);
}
```

**3. Simple Similarity Matching**
```typescript
async function findSimilarSegments(text: string, threshold = 0.8) {
  // Simple Levenshtein distance matching for recurring phrases
  const segments = await db.select().from(learned_segments);
  
  return segments.filter(segment => {
    const similarity = calculateSimilarity(text, segment.sourceText);
    return similarity >= threshold;
  });
}
```

## Lightweight Glossary System

### Simple Term Learning

**1. Auto-Update Glossaries from Corrections**
```typescript
async function updateGlossaryFromCorrections() {
  // Get terminology corrections from last 30 days
  const recentCorrections = await getTerminologyCorrections();
  
  // Add to existing DeepL glossaries (no complex validation needed)
  for (const correction of recentCorrections) {
    if (correction.isApproved) {
      await deepl.addGlossaryEntry(
        correction.glossaryId,
        correction.sourceTerm,
        correction.targetTerm
      );
    }
  }
}
```

**2. Create Temporary Learning Glossaries**
```typescript
async function createLearningGlossary(targetLanguage: string) {
  // Get all approved learned terms for this language
  const learnedTerms = await db.select()
    .from(learned_terms)
    .where(eq(learned_terms.targetLanguage, targetLanguage));
  
  // Create temporary DeepL glossary
  return await deepl.createGlossary(
    `Learned_${targetLanguage}_${Date.now()}`,
    sourceLanguage,
    targetLanguage,
    learnedTerms.map(term => ({
      source: term.sourceTerm,
      target: term.targetTerm
    }))
  );
}
```

## Simplified MVP Roadmap (6 Weeks)

### Week 1: Multi-Language Core
- [ ] Add multi-language columns to existing `translation_jobs` table
- [ ] Build multi-language upload form (select multiple target languages)
- [ ] Implement parallel DeepL processing with existing `translateDocumentsBatch`
- [ ] Add simple progress tracking UI

### Week 2: Basic Feedback Portal
- [ ] Create `translation_corrections` and `learned_segments` tables
- [ ] Build simple side-by-side review interface
- [ ] Add inline editing with "terminology" vs "phrasing" buttons
- [ ] Implement correction submission API

### Week 3: Simple Learning Loop
- [ ] Store corrections in learning tables
- [ ] Create basic segment matching (exact string matches)
- [ ] Build temporary glossary creation from learned terms
- [ ] Apply learned segments to new translations

### Week 4: Learning Integration
- [ ] Auto-apply learned terms before DeepL translation
- [ ] Show "learned corrections applied" in progress tracking  
- [ ] Add "previous corrections" view in feedback portal
- [ ] Basic email notifications for review

### Week 5: Polish & Testing
- [ ] Country user testing with Quooker teams
- [ ] UI/UX improvements based on feedback
- [ ] Performance optimization for parallel processing
- [ ] Bug fixes and edge case handling

### Week 6: Production Ready
- [ ] Final testing and validation
- [ ] Production deployment
- [ ] User training documentation
- [ ] Monitoring and analytics setup

## Post-MVP (V2 Features - Later)
- Advanced similarity matching for segments
- Quality prediction models  
- Analytics dashboards
- Complex pattern extraction
- Multi-provider support

## Expected MVP Benefits

### Week 1-2: Multi-Language Value
- **50% faster multi-language projects** (parallel processing vs sequential)
- **Improved project coordination** (all languages in one job)
- **Better progress visibility** for Quooker teams

### Week 3-4: Learning Foundation
- **Countries can easily submit corrections** (simple portal)
- **System remembers corrections** (no more repeating same fixes)
- **Terminology consistency** across future translations

### Week 5-6: Compounding Value
- **10-20% fewer corrections needed** (learned segments auto-applied)
- **Faster country reviews** (fewer errors to fix)
- **Growing translation database** specific to Quooker's content

### 3-6 Months: Long-term Impact
- **Continuously improving accuracy** as system learns more
- **Reduced manual effort** for recurring content (videos, documents)
- **Country satisfaction improvement** (fewer correction cycles)

## Key Success Metrics

### Primary KPIs (MVP Focus)
- **Multi-language job completion time** (target: 50% reduction)
- **Number of learned corrections applied** (measure learning effectiveness)
- **Country feedback submission rate** (measure portal adoption)
- **Repeat correction reduction** (measure learning impact)

### Secondary KPIs (Post-MVP)
- Translation accuracy scores
- Country satisfaction ratings
- Time-to-market for multilingual content
- System usage adoption rates

---

**Bottom Line**: This simplified approach delivers immediate value (multi-language workflow) while building the foundation for long-term learning that directly solves Quooker's biggest pain point - recurring translation corrections.