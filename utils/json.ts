const parseFirstBalancedObject = <T>(text: string): T => {
  let startIndex = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;
  let lastError: unknown;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (startIndex === -1) {
      if (char === '{') {
        startIndex = index;
        depth = 1;
      }
      continue;
    }

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\' && inString) {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;

      if (depth === 0) {
        const candidate = text.slice(startIndex, index + 1);

        try {
          return JSON.parse(candidate) as T;
        } catch (error) {
          lastError = error;
          startIndex = -1;
          inString = false;
          escaped = false;
        }
      }
    }
  }

  if (lastError) {
    throw new Error(`AI response JSON could not be parsed: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
  }

  throw new Error('AI response did not contain a JSON object');
};

export function parseJsonObject<T>(text: string | undefined): T {
  if (!text || !text.trim()) {
    throw new Error('AI response did not contain a JSON object');
  }

  const withoutFences = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  return parseFirstBalancedObject<T>(withoutFences);
}
