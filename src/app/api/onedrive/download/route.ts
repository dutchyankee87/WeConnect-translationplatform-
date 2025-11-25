import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@microsoft/microsoft-graph-client';

function getGraphClient(accessToken: string) {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const { accessToken, fileId, fileName } = await request.json();

    if (!accessToken || !fileId) {
      return NextResponse.json(
        { error: 'Access token and file ID required' },
        { status: 400 }
      );
    }

    const graphClient = getGraphClient(accessToken);

    // Download file content
    const fileStream = await graphClient
      .api(`/me/drive/items/${fileId}/content`)
      .get();

    // Convert stream to text for processing
    let fileContent = '';
    if (fileName.toLowerCase().endsWith('.csv') || fileName.toLowerCase().endsWith('.txt')) {
      // For CSV/TXT files, convert buffer to string
      const buffer = Buffer.from(fileStream);
      fileContent = buffer.toString('utf-8');
    } else if (fileName.toLowerCase().endsWith('.xlsx') || fileName.toLowerCase().endsWith('.xls')) {
      // For Excel files, we'd need a library like xlsx to parse
      return NextResponse.json(
        { error: 'Excel file processing not yet implemented. Please use CSV or TXT files.' },
        { status: 400 }
      );
    }

    // Parse glossary entries from CSV/TXT content
    const entries = parseGlossaryContent(fileContent);

    return NextResponse.json({
      success: true,
      entries,
      fileName
    });

  } catch (error) {
    console.error('Error downloading OneDrive file:', error);
    return NextResponse.json(
      { error: 'Failed to download file from OneDrive' },
      { status: 500 }
    );
  }
}

function parseGlossaryContent(content: string) {
  const lines = content.split('\n').filter(line => line.trim());
  const entries = [];

  for (const line of lines) {
    // Skip header lines or empty lines
    if (!line.trim() || line.toLowerCase().includes('source') && line.toLowerCase().includes('target')) {
      continue;
    }

    // Try different separators: comma, tab, semicolon
    let parts = [];
    if (line.includes(',')) {
      parts = line.split(',');
    } else if (line.includes('\t')) {
      parts = line.split('\t');
    } else if (line.includes(';')) {
      parts = line.split(';');
    } else {
      continue; // Skip lines without separators
    }

    if (parts.length >= 2) {
      const source = parts[0].trim().replace(/['"]/g, '');
      const target = parts[1].trim().replace(/['"]/g, '');
      
      if (source && target) {
        entries.push({ source, target });
      }
    }
  }

  return entries;
}