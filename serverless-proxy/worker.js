/**
 * DayFlow AI Gateway - Cloudflare Worker Proxy
 * 
 * 100% Free & Secure Serverless AI Backend.
 * Securely manages GEMINI_API_KEY and GROK_API_KEY from Cloudflare Worker Secrets
 * so end users don't need to provide or expose their personal API keys.
 * 
 * Features:
 * - Dual Engine: Google Gemini (Primary) with automatic Serverless Failover to xAI Grok (Fallback)
 * - Full CORS support for DayFlow Firebase Web App & Localhost
 * - Automatic capacity failover through candidate Gemini models (2.5-flash, 3.5-flash-lite, 3.6-flash, 3.8-flash)
 * - Seamless format transformation between Gemini & OpenAI/xAI schemas
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

/**
 * Converts Google Gemini contents & systemInstruction into OpenAI-compatible Chat format for xAI Grok
 */
function convertGeminiPayloadToOpenAI(payload, model = 'grok-2-latest') {
  const messages = [];

  // Extract system instruction if present
  const systemParts = payload.systemInstruction?.parts || [];
  const systemText = systemParts.map(p => p.text).filter(Boolean).join('\n\n');
  if (systemText) {
    messages.push({ role: 'system', content: systemText });
  }

  // Process contents turns
  if (Array.isArray(payload.contents)) {
    payload.contents.forEach(turn => {
      const role = (turn.role === 'model' || turn.role === 'assistant') ? 'assistant' : 'user';
      const parts = Array.isArray(turn.parts) ? turn.parts : [];

      const hasImage = parts.some(p => p.inlineData && p.inlineData.data);
      if (hasImage) {
        const contentList = [];
        parts.forEach(p => {
          if (p.text) {
            contentList.push({ type: 'text', text: p.text });
          } else if (p.inlineData && p.inlineData.data) {
            const mime = p.inlineData.mimeType || 'image/jpeg';
            contentList.push({
              type: 'image_url',
              image_url: { url: `data:${mime};base64,${p.inlineData.data}` }
            });
          }
        });
        messages.push({ role, content: contentList });
      } else {
        const combinedText = parts.map(p => p.text).filter(Boolean).join('\n');
        if (combinedText) {
          messages.push({ role, content: combinedText });
        }
      }
    });
  }

  const result = {
    model: model || 'grok-2-latest',
    messages: messages,
    temperature: payload.generationConfig?.temperature ?? 0.2,
    max_tokens: payload.generationConfig?.maxOutputTokens ?? 2048
  };

  return result;
}

/**
 * Converts OpenAI / xAI response back to Gemini candidate part shape expected by DayFlow
 */
function convertOpenAIToGeminiResponse(grokData) {
  const choice = grokData.choices?.[0];
  const replyText = choice?.message?.content || '';

  return {
    candidates: [
      {
        content: {
          parts: [{ text: replyText }],
          role: 'model'
        },
        finishReason: choice?.finish_reason === 'stop' ? 'STOP' : 'MAX_TOKENS',
        index: 0
      }
    ],
    usageMetadata: {
      promptTokenCount: grokData.usage?.prompt_tokens || 0,
      candidatesTokenCount: grokData.usage?.completion_tokens || 0,
      totalTokenCount: grokData.usage?.total_tokens || 0
    },
    engine: 'xai-grok-fallback'
  };
}

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
      const isGeminiSet = Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== '');
      const isGrokSet = Boolean(env.GROK_API_KEY && env.GROK_API_KEY.trim() !== '');

      return new Response(JSON.stringify({
        status: 'online',
        service: 'DayFlow AI Serverless Gateway',
        version: '1.2.0',
        geminiConfigured: isGeminiSet,
        grokConfigured: isGrokSet,
        keyConfigured: isGeminiSet || isGrokSet,
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
        error: { message: 'Method Not Allowed. Gunakan POST untuk memproses AI generation.' }
      }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

    // 4. Verify Server Secret Configuration (Gemini or Grok)
    const rawGeminiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY || '';
    const geminiKey = rawGeminiKey.trim().replace(/^["'`]|["'`]$/g, '').trim();

    const rawGrokKey = env.GROK_API_KEY || env.XAI_API_KEY || '';
    const grokKey = rawGrokKey.trim().replace(/^["'`]|["'`]$/g, '').trim();
    const grokModel = env.GROK_MODEL || 'grok-2-latest';

    if (!geminiKey && !grokKey) {
      return new Response(JSON.stringify({
        error: {
          message: 'Kunci AI belum dikonfigurasi di Cloudflare Worker Secrets. Tambahkan secret GEMINI_API_KEY atau GROK_API_KEY di dashboard Cloudflare Workers Settings > Variables and Secrets.'
        }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

    try {
      const reqBody = await request.json();
      
      let model = reqBody.model || 'gemini-2.5-flash';
      let payload = reqBody.payload || reqBody;

      // Extract model from URL path if calling /models/:model:generateContent
      const pathMatch = url.pathname.match(/\/models\/([^:]+):generateContent/);
      if (pathMatch && pathMatch[1]) {
        model = pathMatch[1];
      }

      let lastError = null;

      // STEP 1: Attempt Gemini candidate models if GEMINI_API_KEY is configured
      if (geminiKey) {
        const candidateModels = [model, ...FALLBACK_MODELS].filter((v, i, a) => a.indexOf(v) === i);

        for (const currentModel of candidateModels) {
          const googleEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${encodeURIComponent(geminiKey)}`;

          try {
            const googleRes = await fetch(googleEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': geminiKey
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

            // For fatal client input errors (400 bad payload), do not retry Grok
            if (status === 400) {
              return new Response(JSON.stringify(resData), {
                status: status,
                headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
              });
            }

            // If 503 or 429, continue to next Gemini model in loop
          } catch (fetchErr) {
            lastError = { status: 500, message: fetchErr.message, model: currentModel };
          }
        }
      }

      // STEP 2: Automatic Serverless Failover to xAI Grok if Gemini is unavailable or failed
      if (grokKey) {
        try {
          const grokPayload = convertGeminiPayloadToOpenAI(payload, grokModel);
          const grokEndpoint = 'https://api.x.ai/v1/chat/completions';

          const grokRes = await fetch(grokEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${grokKey}`
            },
            body: JSON.stringify(grokPayload)
          });

          if (grokRes.ok) {
            const grokData = await grokRes.json();
            const adaptedResponse = convertOpenAIToGeminiResponse(grokData);

            return new Response(JSON.stringify(adaptedResponse), {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                ...CORS_HEADERS
              }
            });
          }

          const grokErrData = await grokRes.json().catch(() => ({}));
          const grokMsg = grokErrData?.error?.message || `Grok HTTP ${grokRes.status}`;
          lastError = { status: grokRes.status, message: `Gemini sibuk & Grok gagal: ${grokMsg}`, details: lastError };
        } catch (grokErr) {
          lastError = { status: 500, message: `Gemini sibuk & Grok error: ${grokErr.message}`, details: lastError };
        }
      }

      // If both Gemini and Grok failed (or only Gemini failed without Grok configured)
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
