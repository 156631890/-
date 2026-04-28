import { afterEach, describe, expect, it, vi } from 'vitest';
import { isAiImageInputSupported } from './config';

describe('AI proxy config helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reports text-only proxies as not image-capable', () => {
    vi.stubEnv('VITE_AI_PROXY_BASE_URL', 'https://api.deepseek.com');
    vi.stubEnv('VITE_AI_PROXY_MODE', 'openai-compatible');
    vi.stubEnv('VITE_AI_PROXY_INPUT_MODE', 'text-only');
    vi.stubEnv('VITE_AI_MODEL', 'deepseek-v4-flash');

    expect(isAiImageInputSupported()).toBe(false);
  });

  it('reports multimodal proxies as image-capable', () => {
    vi.stubEnv('VITE_AI_PROXY_BASE_URL', 'https://proxy.example/v1');
    vi.stubEnv('VITE_AI_PROXY_MODE', 'openai-compatible');
    vi.stubEnv('VITE_AI_PROXY_INPUT_MODE', 'multimodal');
    vi.stubEnv('VITE_AI_MODEL', 'vision-model');

    expect(isAiImageInputSupported()).toBe(true);
  });
});
