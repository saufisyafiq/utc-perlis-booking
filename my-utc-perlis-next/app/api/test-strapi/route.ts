import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL;
    
    console.log('Environment check:');
    console.log('NEXT_PUBLIC_STRAPI_API_URL:', strapiUrl);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    if (!strapiUrl) {
      return NextResponse.json(
        { 
          error: 'NEXT_PUBLIC_STRAPI_API_URL not configured',
          env: {
            NODE_ENV: process.env.NODE_ENV,
            available_env_vars: Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC_'))
          }
        }, 
        { status: 500 }
      );
    }

    // Test basic connectivity to Strapi
    console.log('Testing connection to:', `${strapiUrl}/api/facilities?pagination[limit]=1`);
    
    const response = await fetch(`${strapiUrl}/api/facilities?pagination[limit]=1`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add timeout
      signal: AbortSignal.timeout(15000), // 15 seconds timeout
    });

    const responseText = await response.text();
    console.log('Strapi response status:', response.status);
    console.log('Strapi response headers:', Object.fromEntries(response.headers.entries()));
    console.log('Strapi response body preview:', responseText.substring(0, 200));

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: 'Strapi API request failed',
          status: response.status,
          statusText: response.statusText,
          url: `${strapiUrl}/api/facilities?pagination[limit]=1`,
          responsePreview: responseText.substring(0, 500)
        }, 
        { status: 500 }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      return NextResponse.json(
        { 
          error: 'Failed to parse Strapi response as JSON',
          responsePreview: responseText.substring(0, 500),
          parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
        }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      strapiUrl,
      facilitiesCount: data.data?.length || 0,
      meta: data.meta,
      message: 'Successfully connected to Strapi API'
    });

  } catch (error) {
    console.error('Test API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to test Strapi connection',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        strapiUrl: process.env.NEXT_PUBLIC_STRAPI_API_URL
      }, 
      { status: 500 }
    );
  }
}
