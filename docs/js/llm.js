/* ══════════════════════════════════════════
   Quill — Client-Side LLM Engine
   Ported from server/services/llm.js.
   Makes direct fetch() calls from the browser
   to any OpenAI-compatible LLM API.
   ══════════════════════════════════════════ */

window.QuillLLM = {

  /**
   * Stream a chat completion from an OpenAI-compatible API.
   * @param {Array} messages - Array of {role, content} objects
   * @param {Function} onChunk - Called for each text delta
   * @param {Function} onDone - Called with the full content when complete
   * @returns {Object} - { abort } to cancel the stream
   */
  streamChat(messages, onChunk, onDone) {
    const controller = new AbortController();

    (async () => {
      try {
        const config = await QuillDB.getConfig();
        const url = `${config.apiUrl}/chat/completions`;
        const headers = { 'Content-Type': 'application/json' };
        if (config.apiKey) {
          headers['Authorization'] = `Bearer ${config.apiKey}`;
        }

        const response = await fetch(url, {
          method: 'POST',
          headers,
          signal: controller.signal,
          body: JSON.stringify({
            model: config.model,
            messages,
            max_tokens: config.maxTokens || 2048,
            temperature: config.temperature || 0.85,
            stream: true,
          }),
        });

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
                onDone?.(fullContent);
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || '';
                if (content) {
                  fullContent += content;
                  onChunk?.(content);
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
        onDone?.(fullContent);

      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('[QuillLLM] Stream error:', err);
          onDone?.('');
        }
      }
    })();

    return { abort: () => controller.abort() };
  },

  /**
   * Non-streaming chat completion (for Auto card generation, etc.)
   * @param {Array} messages - Array of {role, content} objects
   * @returns {Promise<string>} - The full response text
   */
  async chat(messages) {
    const config = await QuillDB.getConfig();
    const url = `${config.apiUrl}/chat/completions`;
    const headers = { 'Content-Type': 'application/json' };
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 min timeout

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model: config.model,
          messages,
          max_tokens: config.maxTokens || 2048,
          temperature: config.temperature || 0.85,
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

    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  },
};
