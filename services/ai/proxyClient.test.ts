import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestAiJson } from './proxyClient';

const setProxyEnv = (overrides: Record<string, string | undefined> = {}) => {
  vi.stubEnv('VITE_AI_PROXY_BASE_URL', overrides.VITE_AI_PROXY_BASE_URL ?? 'https://proxy.example/v1/');
  vi.stubEnv('VITE_AI_PROXY_MODE', overrides.VITE_AI_PROXY_MODE ?? 'openai-compatible');
  vi.stubEnv('VITE_AI_PROXY_INPUT_MODE', overrides.VITE_AI_PROXY_INPUT_MODE ?? 'multimodal');
  vi.stubEnv('VITE_AI_MODEL', overrides.VITE_AI_MODEL ?? 'proxy-model');
  vi.stubEnv('VITE_AI_PROXY_API_KEY', overrides.VITE_AI_PROXY_API_KEY ?? 'secret');
  vi.stubEnv('VITE_AI_TIMEOUT_MS', overrides.VITE_AI_TIMEOUT_MS ?? '60000');
};

describe('requestAiJson', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('sends OpenAI-compatible multimodal requests through the proxy', async () => {
    setProxyEnv();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"name":"toy"}' } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await requestAiJson<{ name: string }>({
      system: 'Return JSON only.',
      parts: [
        { type: 'image', dataUrl: 'data:image/png;base64,abc123' },
        { type: 'text', text: 'Analyze this image.' },
      ],
    });

    expect(result).toEqual({ name: 'toy' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://proxy.example/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer secret',
        },
        body: JSON.stringify({
          model: 'proxy-model',
          messages: [
            { role: 'system', content: 'Return JSON only.' },
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: 'data:image/png;base64,abc123' } },
                { type: 'text', text: 'Analyze this image.' },
              ],
            },
          ],
          temperature: 0.2,
        }),
      }),
    );
  });

  it('sends Gemini-compatible image data as inlineData without an auth header when no key is configured', async () => {
    setProxyEnv({
      VITE_AI_PROXY_MODE: 'gemini-compatible',
      VITE_AI_PROXY_API_KEY: '',
      VITE_AI_MODEL: 'gemini-proxy',
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"hsCode":"950300"}' }] } }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await requestAiJson<{ hsCode: string }>({
      parts: [{ type: 'image', dataUrl: 'data:image/jpeg;base64,xyz789' }],
    });

    expect(result).toEqual({ hsCode: '950300' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://proxy.example/v1/models/gemini-proxy:generateContent',
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ inlineData: { mimeType: 'image/jpeg', data: 'xyz789' } }],
            },
          ],
          generationConfig: { temperature: 0.2 },
        }),
      }),
    );
  });

  it('throws a clear non-2xx proxy error', async () => {
    setProxyEnv();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        text: async () => 'upstream failed',
      }),
    );

    await expect(requestAiJson<{ ok: boolean }>({ parts: [{ type: 'text', text: 'x' }] })).rejects.toThrow(
      'AI proxy request failed with 502: upstream failed',
    );
  });

  it('sends text-only OpenAI-compatible requests with string content for DeepSeek-style APIs', async () => {
    setProxyEnv({
      VITE_AI_PROXY_BASE_URL: 'https://api.deepseek.com',
      VITE_AI_PROXY_INPUT_MODE: 'text-only',
      VITE_AI_MODEL: 'deepseek-v4-flash',
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"ok":true}' } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await requestAiJson<{ ok: boolean }>({
      system: 'Return JSON only.',
      parts: [{ type: 'text', text: 'Give JSON.' }],
    });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.deepseek.com/chat/completions',
      expect.objectContaining({
        body: JSON.stringify({
          model: 'deepseek-v4-flash',
          messages: [
            { role: 'system', content: 'Return JSON only.' },
            { role: 'user', content: 'Give JSON.' },
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
      }),
    );
  });

  it('rejects image parts before calling text-only OpenAI-compatible APIs', async () => {
    setProxyEnv({
      VITE_AI_PROXY_BASE_URL: 'https://api.deepseek.com',
      VITE_AI_PROXY_INPUT_MODE: 'text-only',
      VITE_AI_MODEL: 'deepseek-v4-flash',
    });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      requestAiJson<{ ok: boolean }>({
        parts: [
          { type: 'image', dataUrl: 'data:image/png;base64,abc123' },
          { type: 'text', text: 'Analyze this image.' },
        ],
      }),
    ).rejects.toThrow('The configured AI proxy only supports text input');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires an explicit proxy compatibility mode', async () => {
    setProxyEnv({ VITE_AI_PROXY_MODE: '' });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestAiJson<{ ok: boolean }>({ parts: [{ type: 'text', text: 'x' }] })).rejects.toThrow(
      'Missing VITE_AI_PROXY_MODE',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
