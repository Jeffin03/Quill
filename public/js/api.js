/* ══════════════════════════════════════════
   Quill — API Client
   ══════════════════════════════════════════ */

window.QuillAPI = {
  /**
   * Fetch all stories (metadata only).
   */
  async listStories() {
    const res = await fetch('/api/stories');
    if (!res.ok) throw new Error('Failed to load stories');
    return res.json();
  },

  /**
   * Get a full story by ID.
   */
  async getStory(id) {
    const res = await fetch(`/api/stories/${id}`);
    if (!res.ok) throw new Error('Story not found');
    return res.json();
  },

  /**
   * Create a new story.
   */
  async createStory(data) {
    const res = await fetch('/api/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create story');
    return res.json();
  },

  /**
   * Update story metadata.
   */
  async updateStory(id, data) {
    const res = await fetch(`/api/stories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update story');
    return res.json();
  },

  /**
   * Delete a story.
   */
  async deleteStory(id) {
    const res = await fetch(`/api/stories/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete story');
  },

  /**
   * Send a chat message and receive a streamed response via SSE.
   * Returns an object with methods to handle the stream.
   */
  streamChat(storyId, message, { onChunk, onDone, onError }) {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`/api/stories/${storyId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Unknown error' }));
          onError?.(err.error || 'Chat request failed');
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;

            try {
              const data = JSON.parse(trimmed.slice(6));

              switch (data.type) {
                case 'chunk':
                  onChunk?.(data.content);
                  break;
                case 'done':
                  onDone?.(data);
                  break;
                case 'error':
                  onError?.(data.error);
                  break;
              }
            } catch {
              // Skip malformed events
            }
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          onError?.(err.message);
        }
      }
    })();

    return { abort: () => controller.abort() };
  },

  /**
   * Update a specific message.
   */
  async updateMessage(storyId, messageId, content) {
    const res = await fetch(`/api/stories/${storyId}/messages/${messageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error('Failed to update message');
    return res.json();
  },

  /**
   * Rewind the timeline to a specific message index.
   */
  async rewindTimeline(storyId, messageIndex) {
    const res = await fetch(`/api/stories/${storyId}/rewind`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageIndex }),
    });
    if (!res.ok) throw new Error('Failed to rewind timeline');
    return res.json();
  },

  // ── Card CRUD ────────────────────────────

  async getCards(storyId) {
    const res = await fetch(`/api/cards/${storyId}`);
    if (!res.ok) throw new Error('Failed to load cards');
    return res.json();
  },

  async generateCardsFromPremise(storyId, premise) {
    const res = await fetch(`/api/cards/${storyId}/magic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ premise }),
    });
    if (!res.ok) throw new Error('Failed to generate cards');
    return res.json();
  },

  async createCard(storyId, data) {
    const res = await fetch(`/api/cards/${storyId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create card');
    return res.json();
  },

  async updateCard(storyId, cardId, data) {
    const res = await fetch(`/api/cards/${storyId}/${cardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update card');
    return res.json();
  },

  async deleteCard(storyId, cardId) {
    const res = await fetch(`/api/cards/${storyId}/${cardId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete card');
  },

  // ── Config ───────────────────────────────

  async getConfig() {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Failed to load config');
    return res.json();
  },

  async updateConfig(data) {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update config');
    return res.json();
  },
};
