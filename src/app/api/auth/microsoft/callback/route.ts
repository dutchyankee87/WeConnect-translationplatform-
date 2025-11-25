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
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL('/dashboard/glossaries?error=auth_failed', request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/dashboard/glossaries?error=no_auth_code', request.url));
    }

    const tokenRequest = {
      code,
      scopes: ['https://graph.microsoft.com/Files.Read'],
      redirectUri: process.env.AZURE_REDIRECT_URI!,
    };

    const response = await pca.acquireTokenByCode(tokenRequest);
    
    // Store the access token in session/cookie (simplified for demo)
    const redirectUrl = new URL('/dashboard/glossaries', request.url);
    redirectUrl.searchParams.set('auth_success', 'true');
    redirectUrl.searchParams.set('access_token', response.accessToken);
    
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Error in Microsoft auth callback:', error);
    return NextResponse.redirect(new URL('/dashboard/glossaries?error=auth_callback_failed', request.url));
  }
}