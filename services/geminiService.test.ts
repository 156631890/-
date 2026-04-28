import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requestAiJson } from './ai/proxyClient';
import { analyzeBusinessCard, analyzeImage } from './geminiService';

vi.mock('./ai/proxyClient', () => ({
  requestAiJson: vi.fn(),
}));

const requestAiJsonMock = vi.mocked(requestAiJson);

describe('geminiService proxy failures', () => {
  beforeEach(() => {
    requestAiJsonMock.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('propagates image-analysis proxy failures instead of creating a manual placeholder', async () => {
    requestAiJsonMock.mockRejectedValueOnce(new Error('proxy unavailable'));

    await expect(analyzeImage('data:image/jpeg;base64,abc')).rejects.toThrow('proxy unavailable');
  });

  it('propagates business-card proxy failures instead of creating an empty supplier', async () => {
    requestAiJsonMock.mockRejectedValueOnce(new Error('proxy unavailable'));

    await expect(analyzeBusinessCard('data:image/jpeg;base64,abc')).rejects.toThrow('proxy unavailable');
  });
});
