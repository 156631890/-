import { AiProxyConfig, AiProxyInputMode, AiProxyMode } from './types';

const VALID_MODES: AiProxyMode[] = ['openai-compatible', 'gemini-compatible'];
const VALID_INPUT_MODES: AiProxyInputMode[] = ['multimodal', 'text-only'];

declare global {
  interface ImportMeta {
    readonly env: Record<string, string | undefined>;
  }
}

export const getAiProxyConfig = (): AiProxyConfig => {
  const env = import.meta.env;
  const baseUrl = String(env.VITE_AI_PROXY_BASE_URL ?? '').trim().replace(/\/+$/, '');
  const modeValue = String(env.VITE_AI_PROXY_MODE ?? '').trim();
  const inputModeValue = String(env.VITE_AI_PROXY_INPUT_MODE ?? 'multimodal').trim();
  const model = String(env.VITE_AI_MODEL ?? '').trim();
  const apiKey = String(env.VITE_AI_PROXY_API_KEY ?? '').trim();
  const timeoutMs = Number(env.VITE_AI_TIMEOUT_MS);

  if (!baseUrl) {
    throw new Error('Missing VITE_AI_PROXY_BASE_URL. Configure the Codex reverse-proxy API URL.');
  }

  if (!modeValue) {
    throw new Error('Missing VITE_AI_PROXY_MODE. Set it to openai-compatible or gemini-compatible.');
  }

  if (!VALID_MODES.includes(modeValue as AiProxyMode)) {
    throw new Error('VITE_AI_PROXY_MODE must be openai-compatible or gemini-compatible.');
  }

  if (!VALID_INPUT_MODES.includes(inputModeValue as AiProxyInputMode)) {
    throw new Error('VITE_AI_PROXY_INPUT_MODE must be multimodal or text-only.');
  }

  if (!model) {
    throw new Error('Missing VITE_AI_MODEL. Configure the model served by the Codex reverse proxy.');
  }

  return {
    baseUrl,
    apiKey: apiKey || undefined,
    mode: modeValue as AiProxyMode,
    inputMode: inputModeValue as AiProxyInputMode,
    model,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 60000,
  };
};

export const isAiImageInputSupported = () => {
  const inputModeValue = String(import.meta.env.VITE_AI_PROXY_INPUT_MODE ?? 'multimodal').trim();
  return inputModeValue !== 'text-only';
};
