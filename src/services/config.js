/**
 * DayFlow System & AI Configuration
 * Centralized Gateway Configuration for Gemini AI.
 * 
 * Architecture:
 * - By default, DayFlow calls the Serverless Proxy (Cloudflare Worker) which holds
 *   the project owner's GEMINI_API_KEY as an encrypted server secret.
 * - This allows any user to use DayFlow AI without entering their own API key.
 * - If an owner/developer wants direct client-side fallback during private development,
 *   they can also specify CENTRAL_API_KEY or provide their personal key in Settings.
 */

export const APP_CONFIG = {
  // Free & Secure Serverless AI Proxy endpoint (Cloudflare Worker)
  AI_PROXY_URL: 'https://dayflow.dhavinal20.workers.dev',

  // Optional: Centralized Shared API Key (Used as fallback if proxy URL is not set yet)
  CENTRAL_API_KEY: '',

  // Default Gemini Intelligence Model (Fast, stable & universally supported)
  DEFAULT_MODEL: 'gemini-2.0-flash-lite',

  // Groq / xAI Fallback & Direct Configuration
  GROQ_API_URL: 'https://api.groq.com/openai/v1/chat/completions',
  DEFAULT_GROQ_MODEL: 'llama-3.3-70b-versatile',
  GROK_API_URL: 'https://api.x.ai/v1/chat/completions',
  DEFAULT_GROK_MODEL: 'grok-2-latest',

  // Version identifier
  VERSION: '6.5.0'
};

// Allow runtime override via global window object or localStorage for testing
if (typeof window !== 'undefined') {
  const localProxy = localStorage.getItem('dayflow_proxy_url');
  if (localProxy) {
    APP_CONFIG.AI_PROXY_URL = localProxy;
  }
}
