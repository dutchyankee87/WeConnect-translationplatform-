import { NextRequest, NextResponse } from 'next/server';
import { ConfidentialClientApplication } from '@azure/msal-node';

const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID!,
    clientSecret: process.env.AZURE_CLIENT_SECRET!,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || 'common'}`,
  },
};

const pca = new ConfidentialClientApplication(msalConfig);

export async function GET(request: NextRequest) {
  try {
    const authCodeUrlParameters = {
      scopes: ['https://graph.microsoft.com/Files.Read'],
      redirectUri: process.env.AZURE_REDIRECT_URI!,
      responseMode: 'query' as const,
    };

    const authCodeUrl = await pca.getAuthCodeUrl(authCodeUrlParameters);
    
    return NextResponse.json({ authUrl: authCodeUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate authentication URL' },
      { status: 500 }
    );
  }
}