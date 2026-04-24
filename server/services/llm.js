import { runtimeConfig } from '../config.js';

/**
 * Stream a chat completion from an OpenAI-compatible API.
 * Calls onChunk for each text delta, onDone with full content when complete.
 */
export async function streamChat(messages, onChunk, onDone) {
  const url = `${runtimeConfig.apiUrl}/chat/completions`;
  const headers = { 'Content-Type': 'application/json' };
  if (runtimeConfig.apiKey) {
    headers['Authorization'] = `Bearer ${runtimeConfig.apiKey}`;
  }

  // Create a controller to handle longer timeouts for slower CPUs
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

  const response = await fetch(url, {
    method: 'POST',
    headers,
    signal: controller.signal,
    body: JSON.stringify({
      model: runtimeConfig.model,
      messages,
      max_tokens: runtimeConfig.maxTokens,
      temperature: runtimeConfig.temperature,
      stream: true,
    }),
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`LLM API error (${response.status}): ${errorText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          await onDone(fullContent);
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || '';
          if (content) {
            fullContent += content;
            onChunk(content);
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Stream ended without [DONE] signal
  await onDone(fullContent);
}

/**
 * Non-streaming chat completion fallback.
 */
export async function chat(messages) {
  const url = `${runtimeConfig.apiUrl}/chat/completions`;
  const headers = { 'Content-Type': 'application/json' };
  if (runtimeConfig.apiKey) {
    headers['Authorization'] = `Bearer ${runtimeConfig.apiKey}`;
  }

  // Create a controller for long timeouts
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    signal: controller.signal,
    body: JSON.stringify({
      model: runtimeConfig.model,
      messages,
      max_tokens: runtimeConfig.maxTokens,
      temperature: runtimeConfig.temperature,
      stream: false,
    }),
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`LLM API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}
