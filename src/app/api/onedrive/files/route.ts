import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@microsoft/microsoft-graph-client';

function getGraphClient(accessToken: string) {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    }
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get('access_token');
    const folderId = searchParams.get('folder_id') || 'root';

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token required' },
        { status: 401 }
      );
    }

    const graphClient = getGraphClient(accessToken);

    // Get files and folders from OneDrive
    const driveItems = await graphClient
      .api(`/me/drive/items/${folderId}/children`)
      .select('id,name,size,lastModifiedDateTime,folder,file')
      .get();

    // Filter for supported file types and folders
    const supportedExtensions = ['.xlsx', '.xls', '.csv', '.txt'];
    const filteredItems = driveItems.value.filter((item: any) => {
      if (item.folder) return true; // Include folders for navigation
      if (item.file) {
        const fileName = item.name.toLowerCase();
        return supportedExtensions.some(ext => fileName.endsWith(ext));
      }
      return false;
    });

    // Sort: folders first, then files
    filteredItems.sort((a: any, b: any) => {
      if (a.folder && !b.folder) return -1;
      if (!a.folder && b.folder) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      success: true,
      files: filteredItems.map((item: any) => ({
        id: item.id,
        name: item.name,
        size: item.size,
        lastModified: item.lastModifiedDateTime,
        isFolder: !!item.folder,
        type: item.folder ? 'folder' : 'file'
      }))
    });

  } catch (error) {
    console.error('Error fetching OneDrive files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files from OneDrive' },
      { status: 500 }
    );
  }
}