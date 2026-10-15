/**
 * DayFlow AI Gateway - Cloudflare Worker Proxy
 * 
 * 100% Free & Secure Serverless AI Backend.
 * Securely injects GEMINI_API_KEY from Cloudflare Worker Secrets
 * so end users don't need to provide or expose their personal API keys.
 * 
 * Features:
 * - Full CORS support for DayFlow Firebase Web App & Localhost
 * - Auto-fallback model retry (handles Google 503 High Demand gracefully)
 * - Anti-Slop: Zero emoji, high-performance edge streaming & JSON responses
 * - Zero cost: Cloudflare Workers free plan provides 100,000 requests/day
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-goog-api-key',
  'Access-Control-Max-Age': '86400',
};

const FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.8-flash'
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Handle CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }

    // 2. Health & Status Check Endpoint
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      const isKeySet = Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== '');
      return new Response(JSON.stringify({
        status: 'online',
        service: 'DayFlow AI Serverless Gateway',
        version: '1.0.0',
        keyConfigured: isKeySet,
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS
        }
      });
    }

    // 3. Reject non-POST requests for AI generation
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({
        error: { message: 'Method Not Allowed. Use POST for AI generation.' }
      }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

    // 4. Verify Server Secret Configuration
    const apiKey = env.GEMINI_API_KEY ? env.GEMINI_API_KEY.trim() : '';
    if (!apiKey) {
      return new Response(JSON.stringify({
        error: {
          message: 'GEMINI_API_KEY belum dikonfigurasi di Cloudflare Worker Secrets. Tambahkan secret GEMINI_API_KEY di dashboard Cloudflare Workers Settings > Variables.'
        }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

    try {
      const reqBody = await request.json();
      
      // Determine requested model and payload
      let model = reqBody.model || 'gemini-2.5-flash';
      let payload = reqBody.payload || reqBody;

      // Extract model from URL path if calling /v1beta/models/:model:generateContent
      const pathMatch = url.pathname.match(/\/models\/([^:]+):generateContent/);
      if (pathMatch && pathMatch[1]) {
        model = pathMatch[1];
      }

      // Prepare candidate models list starting with requested model
      const candidateModels = [model, ...FALLBACK_MODELS].filter((v, i, a) => a.indexOf(v) === i);
      let lastError = null;

      // Loop with automatic capacity failover
      for (const currentModel of candidateModels) {
        const googleEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${encodeURIComponent(apiKey)}`;

        try {
          const googleRes = await fetch(googleEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey
            },
            body: JSON.stringify(payload)
          });

          const resData = await googleRes.json();

          if (googleRes.ok) {
            return new Response(JSON.stringify(resData), {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                ...CORS_HEADERS
              }
            });
          }

          const status = googleRes.status;
          const errMsg = resData?.error?.message || `HTTP ${status}`;
          lastError = { status, message: errMsg, model: currentModel };

          // If client authentication error, don't retry other models
          if (status === 400 || status === 403) {
            return new Response(JSON.stringify(resData), {
              status: status,
              headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
            });
          }

          // If 503 or 429, continue to next model in loop
        } catch (fetchErr) {
          lastError = { status: 500, message: fetchErr.message, model: currentModel };
        }
      }

      // If all candidate models failed
      return new Response(JSON.stringify({
        error: {
          message: `Gagal memproses permintaan AI: ${lastError?.message || 'Server kapasitas penuh.'}`,
          details: lastError
        }
      }), {
        status: lastError?.status || 503,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });

    } catch (err) {
      return new Response(JSON.stringify({
        error: { message: `Permintaan tidak valid: ${err.message}` }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }
  }
};
