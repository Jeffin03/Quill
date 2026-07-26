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
  getTextEntry(config) {
    const entries = config.apiEntries || [];
    const routing = config.featureRouting || {};
    // If a specific entry is routed for 'story', use it
    if (routing.story) {
      const routed = entries.find(
        (e) => e.id === routing.story && e.capabilities?.text,
      );
      if (routed) return routed;
    }
    // Fallback: first text-capable entry
    return entries.find((e) => e.capabilities?.text);
  },

  getCardEntry(config) {
    const entries = config.apiEntries || [];
    const routing = config.featureRouting || {};
    if (routing.cards) {
      const routed = entries.find(
        (e) => e.id === routing.cards && e.capabilities?.text,
      );
      if (routed) return routed;
    }
    return this.getTextEntry(config);
  },

  getPromptEntry(config) {
    const entries = config.apiEntries || [];
    const routing = config.featureRouting || {};
    if (routing.prompts) {
      const routed = entries.find(
        (e) => e.id === routing.prompts && e.capabilities?.text,
      );
      if (routed) return routed;
    }
    return this.getTextEntry(config);
  },

  getEntryConfig(entry) {
    if (!entry) return null;
    if (entry.provider === "lmstudio") {
      return {
        baseUrl: (entry.host?.replace(/\/+$/, "") || "http://localhost:1234") + "/v1",
        apiKey: "",
      };
    }
    if (entry.provider === "ollama") {
      return {
        baseUrl: (entry.host?.replace(/\/+$/, "") || "http://localhost:11434") + "/v1",
        apiKey: "",
      };
    }
    if (entry.provider === "openrouter") {
      return {
        baseUrl: "https://openrouter.ai/api/v1",
        apiKey: entry.apiKey || "",
      };
    }
    return {
      baseUrl: entry.host?.replace(/\/+$/, "") || "",
      apiKey: entry.apiKey || "",
    };
  },

  streamChat(messages, onChunk, onDone) {
    const controller = new AbortController();
    (async () => {
      try {
        const config = await QuillDB.getConfig();
        const entry = this.getTextEntry(config);
        if (!entry)
          throw new Error(
            "No text-capable API configured. Add one in Settings → API Manager.",
          );
        await this._streamChat(
          entry,
          messages,
          onChunk,
          onDone,
          controller.signal,
        );
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("[QuillLLM] Stream error:", err);
          onDone?.("");
        }
      }
    })();
    return { abort: () => controller.abort() };
  },

  streamChatWithEntry(entry, messages, onChunk, onDone) {
    const controller = new AbortController();
    (async () => {
      try {
        await this._streamChat(
          entry,
          messages,
          onChunk,
          onDone,
          controller.signal,
        );
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("[QuillLLM] Stream error:", err);
          onDone?.("");
        }
      }
    })();
    return { abort: () => controller.abort() };
  },

  async _streamChat(entry, messages, onChunk, onDone, signal) {
    const { baseUrl, apiKey } = this.getEntryConfig(entry);
    const config = await QuillDB.getConfig();

    const url = `${baseUrl}/chat/completions`;
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers,
      signal,
      body: JSON.stringify({
        model: entry.model || config.recentModels?.[0] || "gpt-3.5-turbo",
        messages,
        max_tokens: config.maxTokens || 2048,
        temperature: config.temperature || 0.85,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`LLM API error (${response.status}): ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6);
          if (data === "[DONE]") {
            onDone?.(fullContent);
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || "";
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

    onDone?.(fullContent);
  },

  /**
   * Non-streaming chat completion (for Auto card generation, etc.)
   * @param {Array} messages - Array of {role, content} objects
   * @returns {Promise<string>} - The full response text
   */
  async chat(messages, options = {}) {
    const config = await QuillDB.getConfig();
    const entry = this.getTextEntry(config);
    if (!entry)
      throw new Error(
        "No text-capable API configured. Add one in Settings → API Manager.",
      );
    return this._chat(entry, messages, options);
  },

  async chatWithEntry(entry, messages, options = {}) {
    return this._chat(entry, messages, options);
  },

  async _chat(entry, messages, options = {}) {
    const { baseUrl, apiKey } = this.getEntryConfig(entry);
    const config = await QuillDB.getConfig();

    const url = `${baseUrl}/chat/completions`;
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model:
            entry.model ||
            options.model ||
            config.recentModels?.[0] ||
            "gpt-3.5-turbo",
          messages,
          max_tokens: options.maxTokens || config.maxTokens || 2048,
          temperature: options.temperature ?? config.temperature ?? 0.85,
          stream: false,
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`LLM API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  },
};
