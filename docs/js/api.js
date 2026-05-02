/* ══════════════════════════════════════════
   Quill — API Client (Serverless)
   Replaces server fetch calls with direct
   IndexedDB reads/writes via QuillDB.
   The QuillAPI interface is kept identical
   so app.js, cards.js etc. need no changes.
   ══════════════════════════════════════════ */

window.QuillAPI = {

  // ── Stories ──────────────────────────────

  async listStories() {
    return QuillDB.listStories();
  },

  async getStory(id) {
    const story = await QuillDB.getStory(id);
    if (!story) throw new Error('Story not found');
    return story;
  },

  async createStory(data) {
    const story = {
      id: QuillUtils.uuid(),
      title: data.title || 'Untitled Story',
      settings: {
        genre: data.genre || 'general fiction',
        pacing: data.pacing || 'natural',
        tone: data.tone || 'atmospheric',
      },
      messages: [],
      cards: [],
      activeBranchId: null, // The ID of the current "leaf" node
      rootMessageId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return QuillDB.saveStory(story);
  },

  async updateStory(id, data) {
    const story = await QuillDB.getStory(id);
    if (!story) throw new Error('Story not found');
    const updated = { ...story, ...data };
    return QuillDB.saveStory(updated);
  },

  async deleteStory(id) {
    return QuillDB.deleteStory(id);
  },

  // ── Chat (Client-Side Streaming) ─────────

  /**
   * Get messages for the active branch (traverses parentId up to root).
   */
  async getBranchMessages(storyId, leafId = null, storyObj = null) {
    const story = storyObj || await QuillDB.getStory(storyId);
    if (!story || !story.messages || story.messages.length === 0) return [];

    const targetId = leafId || story.activeBranchId;
    if (!targetId) return story.messages; // Fallback for old linear stories

    const messages = [];
    const msgMap = new Map(story.messages.map(m => [m.id, m]));

    let currentId = targetId;
    while (currentId) {
      const msg = msgMap.get(currentId);
      if (!msg) break;
      messages.unshift(msg);
      currentId = msg.parentId;
    }

    return messages;
  },

  /**
   * Stream a chat response from the LLM directly.
   */
  streamChat(storyId, message, { onChunk, onDone, onError }) {
    let abortFn = null;

    (async () => {
      try {
        const story = await QuillDB.getStory(storyId);
        if (!story) throw new Error('Story not found');

        // Current leaf is the parent for the new message
        const parentId = story.activeBranchId || (story.messages.length > 0 ? story.messages[story.messages.length - 1].id : null);

        // Save user message
        const userMsg = {
          id: QuillUtils.uuid(),
          role: 'user',
          content: message,
          parentId: parentId,
          timestamp: new Date().toISOString(),
          // User message inherits cards from parent
          cardSnapshot: parentId ? story.messages.find(m => m.id === parentId)?.cardSnapshot : (story.cards || [])
        };
        story.messages.push(userMsg);
        story.activeBranchId = userMsg.id;
        if (!story.rootMessageId) story.rootMessageId = userMsg.id;

        // Build system prompt using the snapshot from the parent
        const systemPrompt = buildSystemPrompt({
          settings: story.settings,
          cards: userMsg.cardSnapshot
        });

        // Build conversation history for THIS branch
        const history = await this.getBranchMessages(storyId, userMsg.id, story);
        const historyLimit = 20;
        const recentHistory = history.slice(-historyLimit);

        const llmMessages = [
          { role: 'system', content: systemPrompt },
          ...recentHistory.map(m => ({ role: m.role, content: m.content })),
        ];

        let fullContent = '';
        const stream = QuillLLM.streamChat(
          llmMessages,
          (chunk) => {
            fullContent += chunk;
            onChunk?.(chunk);
          },
          async (fullResponse) => {
            // Strip any attempted card blocks from prose (model might still try)
            const prose = QuillCardEngine.stripCardBlock(fullResponse);

            // Second call: silent card extraction at low temperature
            let updatedCards = userMsg.cardSnapshot || [];
            try {
              QuillCards.setSyncing(true);
              const cardPrompt = [
                {
                  role: 'system',
                  content: `You are a story state extractor. Given a prose excerpt, return ONLY a JSON array of card updates. Use ONLY these actions: "create", "update", "delete". Use ONLY these types: "character", "relationship", "world", "plot", "arc". If nothing changed, return an empty array []. No explanation, no markdown.`
                },
                {
                  role: 'user',
                  content: `Update the world state based on this scene:\n\n${prose}`
                }
              ];
              const cardJson = await QuillLLM.chat(cardPrompt, { temperature: 0.1, maxTokens: 800 });
              const cardUpdates = QuillCardEngine.parseCardUpdates('[[[QUILL_CARDS_START]]]' + cardJson + '[[[QUILL_CARDS_END]]]');
              updatedCards = QuillCardEngine.applyCardUpdates(userMsg.cardSnapshot || [], cardUpdates);
            } catch (err) {
              console.warn('[streamChat] Card extraction failed silently:', err.message);
              // Non-fatal — prose is already saved, cards just don't update this turn
            } finally {
              QuillCards.setSyncing(false);
            }

            const assistantMsg = {
              id: QuillUtils.uuid(),
              role: 'assistant',
              content: prose,
              parentId: userMsg.id,
              timestamp: new Date().toISOString(),
              cardSnapshot: updatedCards // Capture the new reality
            };
            story.messages.push(assistantMsg);
            story.activeBranchId = assistantMsg.id;
            story.cards = updatedCards; // Keep for global sync
            await QuillDB.saveStory(story);

            onDone?.({ prose, cards: updatedCards, messageId: assistantMsg.id });
          }
        );

        abortFn = stream.abort;

      } catch (err) {
        onError?.(err.message);
      }
    })();

    return { abort: () => abortFn?.() };
  },

  // ── Message Editing ──────────────────────

  async updateMessage(storyId, messageId, content) {
    const story = await QuillDB.getStory(storyId);
    if (!story) throw new Error('Story not found');
    const msg = story.messages.find(m => m.id === messageId);
    if (!msg) throw new Error('Message not found');
    msg.content = content;
    msg.editedAt = new Date().toISOString();
    await QuillDB.saveStory(story);
    return msg;
  },

  // ── Timeline Rewind ──────────────────────

  async rewindTimeline(storyId, messageIndex) {
    const story = await QuillDB.getStory(storyId);
    if (!story) throw new Error('Story not found');
    story.messages = story.messages.slice(0, messageIndex);
    await QuillDB.saveStory(story);
    return story;
  },

  // ── Cards ────────────────────────────────

  async getCards(storyId) {
    const story = await QuillDB.getStory(storyId);
    return story?.cards || [];
  },

  async createCard(storyId, data) {
    const story = await QuillDB.getStory(storyId);
    if (!story) throw new Error('Story not found');
    const card = {
      id: QuillUtils.uuid(),
      type: data.type || 'world',
      title: data.title || 'Untitled Card',
      fields: data.fields || {},
      lastUpdated: new Date().toISOString(),
    };
    story.cards = story.cards || [];
    story.cards.push(card);
    await QuillDB.saveStory(story);
    return card;
  },

  async updateCard(storyId, cardId, data) {
    const story = await QuillDB.getStory(storyId);
    if (!story) throw new Error('Story not found');
    const idx = story.cards.findIndex(c => c.id === cardId);
    if (idx === -1) throw new Error('Card not found');
    story.cards[idx] = { ...story.cards[idx], ...data, lastUpdated: new Date().toISOString() };
    await QuillDB.saveStory(story);
    return story.cards[idx];
  },

  async deleteCard(storyId, cardId) {
    const story = await QuillDB.getStory(storyId);
    if (!story) throw new Error('Story not found');
    story.cards = story.cards.filter(c => c.id !== cardId);
    await QuillDB.saveStory(story);
  },

  async generateCardsFromPremise(storyId, premise) {
    const story = await QuillDB.getStory(storyId);
    if (!story) throw new Error('Story not found');
    const newCards = await QuillCardEngine.generateCardsFromPremise(story.cards || [], premise);
    story.cards = newCards;
    await QuillDB.saveStory(story);
    return newCards;
  },

  // ── Config ───────────────────────────────

  async getConfig() {
    return QuillDB.getConfig();
  },

  async updateConfig(data) {
    return QuillDB.saveConfig(data);
  },
};

// ── System Prompt Builder ─────────────────

function buildSystemPrompt(story) {
  const { genre, pacing, tone } = story.settings || {};

  const pacingGuide = {
    'slow-burn': 'Use slow, measured pacing. Focus on emotion, atmosphere, and internal thoughts. Let tension build very gradually.',
    'moderate': 'Use balanced pacing. Mix action with reflection. Move the story forward at a comfortable rhythm.',
    'fast': 'Use fast, punchy pacing. Keep scenes short and dynamic. Prioritize action over description.',
    'natural': 'Let the scene dictate the pacing. Match the rhythm to what is happening emotionally and narratively.',
  };

  const pacingInstruction = pacingGuide[pacing] || pacingGuide['natural'];

  // Build context from cards
  let cardContext = '';
  if (story.cards && story.cards.length > 0) {
    const grouped = {};
    for (const card of story.cards) {
      if (!grouped[card.type]) grouped[card.type] = [];
      grouped[card.type].push(card);
    }
    cardContext = '\n\n## Story Context\n';
    for (const [type, cards] of Object.entries(grouped)) {
      cardContext += `\n### ${type.charAt(0).toUpperCase() + type.slice(1)}s\n`;
      for (const card of cards) {
        cardContext += `**${card.title}**: ${Object.entries(card.fields).map(([k, v]) => `${k}: ${v}`).join(', ')}\n`;
      }
    }
  }

  const genreList = Array.isArray(genre) ? genre.join(', ') : (genre || 'general fiction');
  return `You are a co-writing a ${genreList} novel with mature themes in a ${tone || 'atmospheric'} style. Write with full literary authenticity. Do not fade to black or use euphemisms unless the director requests it.
STORYTELLING: Write in third-person past tense. Focus on immersive prose. ${pacingInstruction}

${cardContext}`;
}
