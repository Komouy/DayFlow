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
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-2.5-flash'
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
      const isGeminiSet = Boolean((env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== '') || (env.GOOGLE_API_KEY && env.GOOGLE_API_KEY.trim() !== ''));
      const isGroqSet = Boolean((env.GROQ_API_KEY && env.GROQ_API_KEY.trim() !== '') || (env.GROK_API_KEY && env.GROK_API_KEY.trim() !== '') || (env.XAI_API_KEY && env.XAI_API_KEY.trim() !== ''));

      return new Response(JSON.stringify({
        status: 'online',
        service: 'DayFlow AI Serverless Gateway',
        version: '1.3.1',
        geminiConfigured: isGeminiSet,
        groqConfigured: isGroqSet,
        grokConfigured: isGroqSet,
        keyConfigured: isGeminiSet || isGroqSet,
        defaultGeminiModel: 'gemini-3.5-flash-lite',
        defaultGroqModel: 'llama-3.3-70b-versatile',
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

    // 4. Verify Server Secret Configuration (Gemini or Groq)
    const rawGeminiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY || '';
    const geminiKey = rawGeminiKey.trim().replace(/^["'`]|["'`]$/g, '').trim();

    const rawGrokKey = env.GROQ_API_KEY || env.GROK_API_KEY || env.XAI_API_KEY || '';
    const grokKey = rawGrokKey.trim().replace(/^["'`]|["'`]$/g, '').trim();

    // Determine Groq endpoint & default model based on key prefix
    const isXaiKey = grokKey.startsWith('xai-');
    const grokEndpoint = env.GROQ_API_URL || (isXaiKey ? 'https://api.x.ai/v1/chat/completions' : 'https://api.groq.com/openai/v1/chat/completions');
    const grokModel = env.GROQ_MODEL || env.GROK_MODEL || (isXaiKey ? 'grok-2-latest' : 'llama-3.3-70b-versatile');

    if (!geminiKey && !grokKey) {
      return new Response(JSON.stringify({
        error: {
          message: 'Kunci AI belum dikonfigurasi di Cloudflare Worker Secrets. Tambahkan secret GEMINI_API_KEY atau GROQ_API_KEY di dashboard Cloudflare Workers Settings > Variables and Secrets.'
        }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

    try {
      const reqBody = await request.json();
      
      let model = reqBody.model || 'gemini-3.5-flash-lite';
      let payload = reqBody.payload || reqBody;
      const requestedProvider = reqBody.provider || 'gemini'; // 'gemini' | 'groq'

      // Extract model from URL path if calling /models/:model:generateContent
      const pathMatch = url.pathname.match(/\/models\/([^:]+):generateContent/);
      if (pathMatch && pathMatch[1]) {
        model = pathMatch[1];
      }

      let lastError = null;

      // Helper function to call Groq (GroqCloud / xAI)
      const callGroq = async () => {
        const grokPayload = convertGeminiPayloadToOpenAI(payload, grokModel);
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
          adaptedResponse.provider = isXaiKey ? 'xai-grok' : 'groqcloud';
          return adaptedResponse;
        }

        const grokErrData = await grokRes.json().catch(() => ({}));
        const grokMsg = grokErrData?.error?.message || `Groq HTTP ${grokRes.status}`;
        throw new Error(grokMsg);
      };

      // Helper function to call Gemini candidate models
      const callGemini = async () => {
        const candidateModels = [model, ...FALLBACK_MODELS].filter((v, i, a) => a.indexOf(v) === i);
        let geminiErr = null;

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
              return resData;
            }

            const status = googleRes.status;
            const errMsg = resData?.error?.message || `HTTP ${status}`;
            geminiErr = { status, message: errMsg, model: currentModel };

            if (status === 400) {
              throw new Error(errMsg);
            }
          } catch (fetchErr) {
            geminiErr = { status: 500, message: fetchErr.message, model: currentModel };
          }
        }
        throw new Error(geminiErr?.message || 'Seluruh model Gemini gagal.');
      };

      // EXECUTION ROUTE:
      // If user explicitly requests Groq as primary provider
      if (requestedProvider === 'groq' && grokKey) {
        try {
          const groqResult = await callGroq();
          return new Response(JSON.stringify(groqResult), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
          });
        } catch (groqErr) {
          lastError = { message: `Groq gagal: ${groqErr.message}` };
          // Fallback to Gemini if configured
          if (geminiKey) {
            try {
              const geminiResult = await callGemini();
              return new Response(JSON.stringify(geminiResult), {
                status: 200,
                headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
              });
            } catch (geminiErr) {
              lastError = { message: `Groq gagal (${groqErr.message}) & Gemini fallback gagal (${geminiErr.message})` };
            }
          }
        }
      } else {
        // Default: Gemini primary, Groq fallback
        if (geminiKey) {
          try {
            const geminiResult = await callGemini();
            return new Response(JSON.stringify(geminiResult), {
              status: 200,
              headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
            });
          } catch (geminiErr) {
            lastError = { message: geminiErr.message };
          }
        }

        // Automatic fallback to Groq
        if (grokKey) {
          try {
            const groqResult = await callGroq();
            return new Response(JSON.stringify(groqResult), {
              status: 200,
              headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
            });
          } catch (groqErr) {
            lastError = { message: `Gemini kendala & Groq fallback gagal: ${groqErr.message}`, details: lastError };
          }
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
