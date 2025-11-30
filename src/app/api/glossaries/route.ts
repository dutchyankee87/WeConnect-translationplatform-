import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { glossaries, glossaryEntries } from '@/lib/db/schema';
import { deepl } from '@/lib/deepl';
import { getCurrentUser } from '@/lib/user';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allGlossaries = await db
      .select()
      .from(glossaries)
      .orderBy(desc(glossaries.createdAt));

    return NextResponse.json({ success: true, glossaries: allGlossaries });
  } catch (error) {
    console.error('Glossaries fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const { name, sourceLanguage, targetLanguage, entries } = body;

    if (!name || !sourceLanguage || !targetLanguage || !entries || !Array.isArray(entries)) {
      return NextResponse.json({ error: 'Invalid glossary data' }, { status: 400 });
    }

    // Create glossary in our database
    const [glossary] = await db
      .insert(glossaries)
      .values({
        name,
        sourceLanguage,
        targetLanguage,
        entriesCount: entries.length,
        status: 'syncing',
      })
      .returning();

    // Create glossary entries
    if (entries.length > 0) {
      await db.insert(glossaryEntries).values(
        entries.map((entry: { source: string; target: string }) => ({
          glossaryId: glossary.id,
          sourceTerm: entry.source,
          targetTerm: entry.target,
        }))
      );
    }

    // Try to sync with DeepL
    try {
      const deeplGlossaryId = await deepl.createGlossary(
        name,
        sourceLanguage,
        targetLanguage,
        entries
      );

      // Update glossary with DeepL ID and status
      await db
        .update(glossaries)
        .set({ 
          deeplGlossaryId,
          status: 'ready',
        })
        .where(eq(glossaries.id, glossary.id));

      return NextResponse.json({ 
        success: true, 
        glossary: { 
          ...glossary, 
          deeplGlossaryId,
          status: 'ready' 
        } 
      });
    } catch (deeplError) {
      console.error('DeepL sync error:', deeplError);
      
      // Update status to error but keep the glossary
      await db
        .update(glossaries)
        .set({ status: 'error' })
        .where(eq(glossaries.id, glossary.id));

      return NextResponse.json({ 
        success: true, 
        glossary: { ...glossary, status: 'error' },
        warning: 'Glossary created but failed to sync with DeepL'
      });
    }
  } catch (error) {
    console.error('Glossary creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const glossaryId = searchParams.get('id');

    if (!glossaryId) {
      return NextResponse.json({ error: 'Glossary ID required' }, { status: 400 });
    }

    // Get glossary to check if it exists and get DeepL ID
    const [glossary] = await db
      .select()
      .from(glossaries)
      .where(eq(glossaries.id, glossaryId));

    if (!glossary) {
      return NextResponse.json({ error: 'Glossary not found' }, { status: 404 });
    }

    // Delete from DeepL if it has a DeepL ID
    if (glossary.deeplGlossaryId) {
      try {
        await deepl.deleteGlossary(glossary.deeplGlossaryId);
      } catch (deeplError) {
        console.error('DeepL deletion error:', deeplError);
        // Continue with local deletion even if DeepL fails
      }
    }

    // Delete glossary entries first (foreign key constraint)
    await db
      .delete(glossaryEntries)
      .where(eq(glossaryEntries.glossaryId, glossaryId));

    // Delete the glossary
    await db
      .delete(glossaries)
      .where(eq(glossaries.id, glossaryId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Glossary deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}