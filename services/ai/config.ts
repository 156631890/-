import { AiProxyConfig, AiProxyMode } from './types';

const VALID_MODES: AiProxyMode[] = ['openai-compatible', 'gemini-compatible'];

declare global {
  interface ImportMeta {
    readonly env: Record<string, string | undefined>;
  }
}

export const getAiProxyConfig = (): AiProxyConfig => {
  const env = import.meta.env;
  const baseUrl = String(env.VITE_AI_PROXY_BASE_URL ?? '').trim().replace(/\/+$/, '');
  const modeValue = String(env.VITE_AI_PROXY_MODE ?? 'openai-compatible').trim();
  const model = String(env.VITE_AI_MODEL ?? '').trim();
  const apiKey = String(env.VITE_AI_PROXY_API_KEY ?? '').trim();
  const timeoutMs = Number(env.VITE_AI_TIMEOUT_MS);

  if (!baseUrl) {
    throw new Error('Missing VITE_AI_PROXY_BASE_URL. Configure the Codex reverse-proxy API URL.');
  }

  if (!VALID_MODES.includes(modeValue as AiProxyMode)) {
    throw new Error('VITE_AI_PROXY_MODE must be openai-compatible or gemini-compatible.');
  }

  if (!model) {
    throw new Error('Missing VITE_AI_MODEL. Configure the model served by the Codex reverse proxy.');
  }

  return {
    baseUrl,
    apiKey: apiKey || undefined,
    mode: modeValue as AiProxyMode,
    model,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 60000,
  };
};
