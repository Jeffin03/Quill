/* ══════════════════════════════════════════
   Quill — Client-Side Card Engine
   Ported from server/services/cardEngine.js.
   Handles parsing card updates from LLM
   responses and auto-generation from premise.
   ══════════════════════════════════════════ */

window.QuillCardEngine = (() => {
  const CARD_BLOCK_REGEX = /\[\[\[QUILL_CARDS_START\]\]\]\s*([\s\S]*?)\s*(?:\[\[\[QUILL_CARDS_END\]\]\]|$)/;

  /**
   * Parse context card update instructions from the LLM response.
   * Returns an array of card operations (create/update/delete).
   */
  function parseCardUpdates(rawResponse) {
    const match = rawResponse.match(CARD_BLOCK_REGEX);
    if (!match) return [];

    let jsonStr = match[1].trim();

    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.warn('[CardEngine] Truncated JSON detected, attempting repair...');
      const repaired = repairJson(jsonStr);
      try {
        return JSON.parse(repaired);
      } catch (e2) {
        console.error('[CardEngine] Failed to repair JSON:', e2.message);
        return [];
      }
    }
  }

  /**
   * Strip the card block from the response, returning prose only.
   */
  function stripCardBlock(rawResponse) {
    return rawResponse.replace(CARD_BLOCK_REGEX, '').trim();
  }

  /**
   * Apply card update operations to the existing cards array.
   * Returns a new array with updates applied.
   */
  function applyCardUpdates(existingCards, updates) {
    if (!updates || updates.length === 0) return existingCards;

    const cards = existingCards.map(c => ({ ...c }));

    for (const update of updates) {
      switch (update.action) {
        case 'create': {
          cards.push({
            id: crypto.randomUUID(),
            type: update.type || 'world',
            title: update.title || 'Untitled Card',
            fields: update.fields || {},
            lastUpdated: new Date().toISOString(),
          });
          break;
        }
        case 'update': {
          const idx = cards.findIndex(c => c.title === update.title || c.id === update.id);
          if (idx !== -1) {
            cards[idx] = {
              ...cards[idx],
              fields: { ...cards[idx].fields, ...(update.fields || {}) },
              lastUpdated: new Date().toISOString(),
            };
          }
          break;
        }
        case 'delete': {
          const idx = cards.findIndex(c => c.title === update.title || c.id === update.id);
          if (idx !== -1) cards.splice(idx, 1);
          break;
        }
        default:
          console.warn('[CardEngine] Unknown card action:', update.action);
      }
    }

    return cards;
  }

  /**
   * Auto-generate cards from a premise string using the LLM.
   */
  async function generateCardsFromPremise(existingCards, premise) {
    const systemPrompt = `You are an expert story data extractor. Your job is to read the story premise and extract the key elements into structured JSON data.

RULES:
1. You MUST return ONLY a raw JSON array.
2. No conversational text, no markdown formatting (like \`\`\`json), no explanations.
3. The "type" field MUST be exactly one of these lowercase strings: "character", "relationship", "plot", "world", "arc". DO NOT invent new types.
4. Keep the "fields" concise.

JSON SCHEMA EXAMPLE:
[
  {
    "action": "create",
    "type": "character",
    "title": "Elise",
    "fields": {
      "Role": "Undercover Agent",
      "Traits": "Former actress, pink hair, violet eyes"
    }
  },
  {
    "action": "create",
    "type": "relationship",
    "title": "Elise & Lucas",
    "fields": {
      "Dynamic": "Allies / Acting Coach",
      "Status": "Cooperating on mission"
    }
  }
]

Start your response immediately with [`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Extract key story elements from this premise:\n\n${premise}` },
    ];

    let rawJson = '';
    try {
      rawJson = await QuillLLM.chat(messages);
    } catch (err) {
      console.error('[CardEngine] Auto generation failed:', err);
      throw err;
    }

    // Strip any markdown code fences the LLM might still add
    rawJson = rawJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    if (!rawJson.startsWith('[')) {
      const start = rawJson.indexOf('[');
      if (start !== -1) rawJson = rawJson.slice(start);
    }

    let updates = [];
    try {
      updates = JSON.parse(rawJson);
    } catch (e) {
      console.warn('[CardEngine] Auto parse failed, attempting repair...');
      const repaired = repairJson(rawJson);
      try {
        updates = JSON.parse(repaired);
      } catch (e2) {
        console.error('[CardEngine] Could not parse auto-generated cards:', e2.message);
        throw new Error('The AI response could not be parsed as valid JSON.');
      }
    }

    return applyCardUpdates(existingCards, updates);
  }

  /**
   * Attempt to repair truncated JSON by closing open structures.
   */
  function repairJson(str) {
    // Remove trailing incomplete property
    let s = str.replace(/,\s*$/, '').replace(/,\s*\]$/, ']');

    // Close any unclosed objects
    const openBraces = (s.match(/\{/g) || []).length;
    const closeBraces = (s.match(/\}/g) || []).length;
    for (let i = 0; i < openBraces - closeBraces; i++) s += '}';

    // Close the array if needed
    if (!s.trimEnd().endsWith(']')) s += ']';

    return s;
  }

  return {
    parseCardUpdates,
    stripCardBlock,
    applyCardUpdates,
    generateCardsFromPremise,
  };
})();
