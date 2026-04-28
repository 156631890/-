import { describe, expect, it } from 'vitest';
import { parseJsonObject } from './json';

describe('parseJsonObject', () => {
  it('parses raw JSON', () => {
    expect(parseJsonObject<{ name: string }>('{"name":"toy"}')).toEqual({ name: 'toy' });
  });

  it('parses fenced JSON', () => {
    expect(parseJsonObject<{ hsCode: string }>('```json\n{"hsCode":"950300"}\n```')).toEqual({ hsCode: '950300' });
  });

  it('extracts JSON from wrapped text', () => {
    expect(parseJsonObject<{ price: number }>('result: {"price": 12.5} done')).toEqual({ price: 12.5 });
  });

  it('throws a readable error for invalid text', () => {
    expect(() => parseJsonObject('not json')).toThrow('AI response did not contain a JSON object');
  });
});
