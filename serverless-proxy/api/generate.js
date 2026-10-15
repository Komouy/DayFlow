/**
 * DayFlow AI Gateway - Vercel Serverless Function (Node.js Edge / Serverless)
 * Alternative free backend hosting on Vercel.
 */

export const config = {
  runtime: 'edge',
};

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

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method === 'GET') {
    const isKeySet = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '');
    return new Response(JSON.stringify({
      status: 'online',
      service: 'DayFlow AI Vercel Edge Gateway',
      keyConfigured: isKeySet
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: { message: 'Method Not Allowed' } }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return new Response(JSON.stringify({
      error: { message: 'GEMINI_API_KEY environment variable belum dikonfigurasi di Vercel.' }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }

  try {
    const reqBody = await request.json();
    let model = reqBody.model || 'gemini-2.5-flash';
    let payload = reqBody.payload || reqBody;

    const candidateModels = [model, ...FALLBACK_MODELS].filter((v, i, a) => a.indexOf(v) === i);
    let lastError = null;

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
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
          });
        }

        const status = googleRes.status;
        lastError = { status, message: resData?.error?.message || `HTTP ${status}` };
        if (status === 400 || status === 403) {
          return new Response(JSON.stringify(resData), {
            status,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
          });
        }
      } catch (err) {
        lastError = { status: 500, message: err.message };
      }
    }

    return new Response(JSON.stringify({
      error: { message: `Gagal memproses AI: ${lastError?.message || 'Server penuh'}` }
    }), {
      status: lastError?.status || 503,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: { message: err.message } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}
