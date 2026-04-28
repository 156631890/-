import { parseJsonObject } from '../../utils/json';
import { getAiProxyConfig } from './config';
import { AiJsonRequest, AiPart } from './types';

type OpenAiTextContent = { type: 'text'; text: string };
type OpenAiImageContent = { type: 'image_url'; image_url: { url: string } };
type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

const DATA_URL_PATTERN = /^data:([^;]+);base64,(.*)$/;

const toOpenAiContent = (parts: AiPart[]): Array<OpenAiTextContent | OpenAiImageContent> =>
  parts.map((part) =>
    part.type === 'text'
      ? { type: 'text', text: part.text }
      : { type: 'image_url', image_url: { url: part.dataUrl } },
  );

const toGeminiParts = (parts: AiPart[]): GeminiPart[] =>
  parts.map((part) => {
    if (part.type === 'text') {
      return { text: part.text };
    }

    const match = DATA_URL_PATTERN.exec(part.dataUrl);
    return {
      inlineData: {
        mimeType: match?.[1] || 'image/jpeg',
        data: match?.[2] || part.dataUrl,
      },
    };
  });

const extractOpenAiText = (response: unknown): string => {
  const content = (response as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === 'string' ? text : '';
        }
        return '';
      })
      .join('');
  }

  throw new Error('AI proxy response did not include OpenAI message content.');
};

const extractGeminiText = (response: unknown): string => {
  const parts = (response as { candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }> }).candidates?.[0]?.content
    ?.parts;

  if (!Array.isArray(parts)) {
    throw new Error('AI proxy response did not include Gemini content parts.');
  }

  return parts.map((part) => (typeof part.text === 'string' ? part.text : '')).join('');
};

export const requestAiJson = async <T>({ parts, system }: AiJsonRequest): Promise<T> => {
  const config = getAiProxyConfig();
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), config.timeoutMs);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  const url =
    config.mode === 'openai-compatible'
      ? `${config.baseUrl}/chat/completions`
      : `${config.baseUrl}/models/${encodeURIComponent(config.model)}:generateContent`;

  const body =
    config.mode === 'openai-compatible'
      ? {
          model: config.model,
          messages: [
            ...(system ? [{ role: 'system', content: system }] : []),
            { role: 'user', content: toOpenAiContent(parts) },
          ],
          temperature: 0.2,
        }
      : {
          contents: [{ role: 'user', parts: toGeminiParts(parts) }],
          generationConfig: { temperature: 0.2 },
        };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`AI proxy request failed with ${response.status}: ${errorBody || response.statusText}`);
    }

    const payload = (await response.json()) as unknown;
    const text = config.mode === 'openai-compatible' ? extractOpenAiText(payload) : extractGeminiText(payload);
    return parseJsonObject<T>(text);
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
};
