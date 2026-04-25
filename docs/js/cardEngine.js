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
      console.warn('[CardEngine] JSON parse failed, attempting repair...');
      try {
        const repaired = repairJson(jsonStr);
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
            id: QuillUtils.uuid(),
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
    const systemPrompt = `You are an unfiltered story data extractor. Read the story premise and extract key elements into structured JSON.
    
RULES:
1. Return ONLY a raw JSON array.
2. No conversation, no markdown code blocks.
3. Types: "character", "relationship", "plot", "world", "arc".
4. Format: [{"action": "create", "type": "...", "title": "...", "fields": {...}}, ...]`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Extract elements from this premise:\n\n${premise}` },
    ];

    let rawJson = '';
    try {
      rawJson = await QuillLLM.chat(messages);
    } catch (err) {
      console.error('[CardEngine] Auto generation failed:', err);
      throw err;
    }

    // Strip markdown and extract JSON array
    rawJson = rawJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const startIdx = rawJson.indexOf('[');
    const endIdx = rawJson.lastIndexOf(']');
    if (startIdx !== -1 && endIdx !== -1) {
      rawJson = rawJson.substring(startIdx, endIdx + 1);
    }

    try {
      return applyCardUpdates(existingCards, JSON.parse(rawJson));
    } catch (e) {
      console.warn('[CardEngine] JSON parse failed, attempting deep repair...');
      try {
        const repaired = repairJson(rawJson);
        return applyCardUpdates(existingCards, JSON.parse(repaired));
      } catch (e2) {
        console.error('[CardEngine] Deep repair failed:', e2.message);
        throw new Error('AI response was not valid JSON and could not be repaired.');
      }
    }
  }

  /**
   * Robust JSON repair for LLM-generated data.
   */
  function repairJson(str) {
    let s = str.trim();

    // 1. Fix single quotes to double quotes (naive but effective for most cases)
    s = s.replace(/'/g, '"');

    // 2. Fix unquoted keys (e.g. {title: "..."} -> {"title": "..."})
    s = s.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');

    // 3. Remove trailing commas before closing braces/brackets
    s = s.replace(/,\s*([\}\]])/g, '$1');

    // 4. Handle truncated strings (close unclosed quotes)
    const quoteCount = (s.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) s += '"';

    // 5. Close unclosed objects/arrays
    const openBraces = (s.match(/\{/g) || []).length;
    const closeBraces = (s.match(/\}/g) || []).length;
    for (let i = 0; i < openBraces - closeBraces; i++) s += '}';

    const openBrackets = (s.match(/\[/g) || []).length;
    const closeBrackets = (s.match(/\]/g) || []).length;
    for (let i = 0; i < openBrackets - closeBrackets; i++) s += ']';

    return s;
  }

  return {
    parseCardUpdates,
    stripCardBlock,
    applyCardUpdates,
    generateCardsFromPremise,
  };
})();
