import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { glossaries, glossaryEntries } from '@/lib/db/schema';
import { deepl } from '@/lib/deepl';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const glossaryId = params.id;

    // Get glossary with its entries
    const [glossary] = await db
      .select()
      .from(glossaries)
      .where(eq(glossaries.id, glossaryId));

    if (!glossary) {
      return NextResponse.json({ error: 'Glossary not found' }, { status: 404 });
    }

    const entries = await db
      .select()
      .from(glossaryEntries)
      .where(eq(glossaryEntries.glossaryId, glossaryId));

    return NextResponse.json({ 
      success: true, 
      glossary: {
        ...glossary,
        entries: entries.map(entry => ({
          id: entry.id,
          source: entry.sourceTerm,
          target: entry.targetTerm,
        }))
      }
    });
  } catch (error) {
    console.error('Glossary fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const glossaryId = params.id;
    const body = await request.json();
    const { name, sourceLanguage, targetLanguage, entries } = body;

    if (!name || !sourceLanguage || !targetLanguage || !entries || !Array.isArray(entries)) {
      return NextResponse.json({ error: 'Invalid glossary data' }, { status: 400 });
    }

    // Get existing glossary
    const [existingGlossary] = await db
      .select()
      .from(glossaries)
      .where(eq(glossaries.id, glossaryId));

    if (!existingGlossary) {
      return NextResponse.json({ error: 'Glossary not found' }, { status: 404 });
    }

    // Update glossary status to syncing
    await db
      .update(glossaries)
      .set({ 
        name,
        sourceLanguage,
        targetLanguage,
        entriesCount: entries.length,
        status: 'syncing',
        updatedAt: new Date(),
      })
      .where(eq(glossaries.id, glossaryId));

    // Delete existing entries
    await db
      .delete(glossaryEntries)
      .where(eq(glossaryEntries.glossaryId, glossaryId));

    // Insert new entries
    if (entries.length > 0) {
      await db.insert(glossaryEntries).values(
        entries.map((entry: { source: string; target: string }) => ({
          glossaryId,
          sourceTerm: entry.source,
          targetTerm: entry.target,
        }))
      );
    }

    // Try to update in DeepL
    try {
      let deeplGlossaryId = existingGlossary.deeplGlossaryId;
      
      // If DeepL ID exists, delete the old glossary and create a new one
      if (deeplGlossaryId) {
        try {
          await deepl.deleteGlossary(deeplGlossaryId);
        } catch (deleteError) {
          console.error('DeepL delete error during update:', deleteError);
        }
      }

      // Create new glossary in DeepL
      deeplGlossaryId = await deepl.createGlossary(
        name,
        sourceLanguage,
        targetLanguage,
        entries
      );

      // Update glossary with new DeepL ID and status
      await db
        .update(glossaries)
        .set({ 
          deeplGlossaryId,
          status: 'ready',
          updatedAt: new Date(),
        })
        .where(eq(glossaries.id, glossaryId));

      return NextResponse.json({ 
        success: true, 
        glossary: { 
          ...existingGlossary,
          name,
          sourceLanguage,
          targetLanguage,
          entriesCount: entries.length,
          deeplGlossaryId,
          status: 'ready' 
        } 
      });
    } catch (deeplError) {
      console.error('DeepL sync error during update:', deeplError);
      
      // Update status to error but keep the changes
      await db
        .update(glossaries)
        .set({ status: 'error', updatedAt: new Date() })
        .where(eq(glossaries.id, glossaryId));

      return NextResponse.json({ 
        success: true, 
        glossary: { 
          ...existingGlossary,
          name,
          sourceLanguage,
          targetLanguage,
          entriesCount: entries.length,
          status: 'error' 
        },
        warning: 'Glossary updated but failed to sync with DeepL'
      });
    }
  } catch (error) {
    console.error('Glossary update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}