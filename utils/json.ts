export function parseJsonObject<T>(text: string | undefined): T {
  if (!text || !text.trim()) {
    throw new Error('AI response did not contain a JSON object');
  }

  const withoutFences = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const firstBrace = withoutFences.indexOf('{');
  const lastBrace = withoutFences.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error('AI response did not contain a JSON object');
  }

  const candidate = withoutFences.slice(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(candidate) as T;
  } catch (error) {
    throw new Error(`AI response JSON could not be parsed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
