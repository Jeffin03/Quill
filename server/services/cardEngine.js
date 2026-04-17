import { v4 as uuidv4 } from 'uuid';

const CARD_BLOCK_REGEX = /---CARDS---\s*([\s\S]*?)\s*---END CARDS---/;

/**
 * Parse context card update instructions from the LLM response.
 * Returns an array of card operations (create/update/delete).
 */
export function parseCardUpdates(rawResponse) {
  const match = rawResponse.match(CARD_BLOCK_REGEX);
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[1]);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('[CardEngine] Failed to parse card updates:', e.message);
    return [];
  }
}

/**
 * Strip the ---CARDS--- block from the response, returning prose only.
 */
export function stripCardBlock(rawResponse) {
  return rawResponse.replace(CARD_BLOCK_REGEX, '').trim();
}

/**
 * Apply card update operations to the existing cards array.
 * Returns a new array with updates applied.
 */
export function applyCardUpdates(existingCards, updates) {
  if (!updates || updates.length === 0) return existingCards;

  const cards = existingCards.map(c => ({ ...c }));

  for (const update of updates) {
    switch (update.action) {
      case 'create': {
        cards.push({
          id: uuidv4(),
          type: update.type || 'world',
          title: update.title || 'Untitled Card',
          fields: update.fields || {},
          lastUpdated: new Date().toISOString(),
        });
        break;
      }
      case 'update': {
        const idx = cards.findIndex(c => c.id === update.id);
        if (idx !== -1) {
          cards[idx] = {
            ...cards[idx],
            fields: { ...cards[idx].fields, ...update.fields },
            ...(update.title ? { title: update.title } : {}),
            lastUpdated: new Date().toISOString(),
          };
        }
        break;
      }
      case 'delete': {
        const delIdx = cards.findIndex(c => c.id === update.id);
        if (delIdx !== -1) cards.splice(delIdx, 1);
        break;
      }
      default:
        console.warn(`[CardEngine] Unknown card action: ${update.action}`);
    }
  }

  return cards;
}
