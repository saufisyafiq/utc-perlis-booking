"use client";

import { useEffect, useState } from 'react';
import { getAppConfig, validateConfig, getStrapiApiUrl, buildStrapiUrl } from '../../lib/config';

export default function DebugEnvPage() {
  const [config, setConfig] = useState<any>(null);
  const [validation, setValidation] = useState<any>(null);
  const [testFetch, setTestFetch] = useState<any>(null);

  useEffect(() => {
    // Get configuration
    const appConfig = getAppConfig();
    setConfig(appConfig);

    // Validate configuration
    const configValidation = validateConfig();
    setValidation(configValidation);

    // Test a simple fetch
    const testApiFetch = async () => {
      try {
        const apiUrl = buildStrapiUrl('api/facilities?pagination[limit]=1');
        if (!apiUrl) {
          setTestFetch({ error: 'Unable to build API URL' });
          return;
        }

        console.log('Testing fetch to:', apiUrl);
        const response = await fetch(apiUrl, { cache: 'no-store' });
        
        setTestFetch({
          url: apiUrl,
          status: response.status,
          ok: response.ok,
          statusText: response.statusText
        });
      } catch (error) {
        setTestFetch({
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    testApiFetch();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Environment Debug Page</h1>
      
      <div className="space-y-6">
        {/* Environment Variables */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>
              <strong>NEXT_PUBLIC_STRAPI_API_URL:</strong> 
              <span className={`ml-2 ${process.env.NEXT_PUBLIC_STRAPI_API_URL ? 'text-green-600' : 'text-red-600'}`}>
                {process.env.NEXT_PUBLIC_STRAPI_API_URL || 'UNDEFINED'}
              </span>
            </div>
            <div>
              <strong>NEXT_PUBLIC_SITE_URL:</strong> 
              <span className="ml-2">
                {process.env.NEXT_PUBLIC_SITE_URL || 'UNDEFINED'}
              </span>
            </div>
            <div>
              <strong>NODE_ENV:</strong> 
              <span className="ml-2">
                {process.env.NODE_ENV || 'UNDEFINED'}
              </span>
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className="bg-blue-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">App Configuration</h2>
          <pre className="bg-white p-4 rounded border overflow-x-auto text-sm">
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>

        {/* Validation */}
        <div className="bg-yellow-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Configuration Validation</h2>
          <div className="space-y-2">
            <div>
              <strong>Is Valid:</strong> 
              <span className={`ml-2 ${validation?.isValid ? 'text-green-600' : 'text-red-600'}`}>
                {validation?.isValid ? 'YES' : 'NO'}
              </span>
            </div>
            {validation?.errors && validation.errors.length > 0 && (
              <div>
                <strong>Errors:</strong>
                <ul className="ml-4 mt-2 space-y-1">
                  {validation.errors.map((error: string, index: number) => (
                    <li key={index} className="text-red-600">• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* API Test */}
        <div className="bg-green-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">API Connection Test</h2>
          {testFetch ? (
            <div className="space-y-2">
              {testFetch.error ? (
                <div className="text-red-600">
                  <strong>Error:</strong> {testFetch.error}
                </div>
              ) : (
                <div className="space-y-1">
                  <div><strong>URL:</strong> {testFetch.url}</div>
                  <div>
                    <strong>Status:</strong> 
                    <span className={`ml-2 ${testFetch.ok ? 'text-green-600' : 'text-red-600'}`}>
                      {testFetch.status} {testFetch.statusText}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>Testing...</div>
          )}
        </div>

        {/* All Environment Variables */}
        <div className="bg-purple-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">All NEXT_PUBLIC_ Variables</h2>
          <div className="space-y-1 font-mono text-sm">
            {Object.entries(process.env)
              .filter(([key]) => key.startsWith('NEXT_PUBLIC_'))
              .map(([key, value]) => (
                <div key={key}>
                  <strong>{key}:</strong> 
                  <span className="ml-2">{value || 'UNDEFINED'}</span>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
