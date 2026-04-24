import { v4 as uuidv4 } from 'uuid';
import * as llm from './llm.js';

const CARD_BLOCK_REGEX = /\[\[\[QUILL_CARDS_START\]\]\]\s*([\s\S]*?)\s*(?:\[\[\[QUILL_CARDS_END\]\]\]|$)/;

/**
 * Parse context card update instructions from the LLM response.
 * Returns an array of card operations (create/update/delete).
 */
export function parseCardUpdates(rawResponse) {
  const match = rawResponse.match(CARD_BLOCK_REGEX);
  if (!match) return [];

  let jsonStr = match[1].trim();
  
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    // If parsing fails, try to repair truncated JSON (common when max_tokens is reached)
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
 * Simple repair for truncated JSON arrays of objects.
 * Closes open braces and brackets to make the string parsable.
 */
function repairJson(str) {
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let lastNonWhitespaceIndex = -1;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '"' && str[i-1] !== '\\') inString = !inString;
    if (!inString) {
      if (char === '{') openBraces++;
      if (char === '}') openBraces--;
      if (char === '[') openBrackets++;
      if (char === ']') openBrackets--;
      if (/\S/.test(char)) lastNonWhitespaceIndex = i;
    }
  }

  // Slice at the last valid position to avoid partial keys/values
  let repaired = str;
  
  if (openBraces > 0 || openBrackets > 0) {
    // If we are mid-object, we try to find the last complete object in the array
    // Or just close the current one if it's mostly there
    if (inString) repaired += '"';
    while (openBraces > 0) { repaired += '}'; openBraces--; }
    while (openBrackets > 0) { repaired += ']'; openBrackets--; }
  }

  return repaired;
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

/**
 * Auto-generate cards from a premise string using the LLM.
 */
export async function generateCardsFromPremise(premise) {
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
    { role: 'user', content: premise }
  ];

  const responseText = await llm.chat(messages);
  
  let jsonStr = responseText.trim();
  if (jsonStr.startsWith('\`\`\`json')) {
    jsonStr = jsonStr.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
  } else if (jsonStr.startsWith('\`\`\`')) {
    jsonStr = jsonStr.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
  }
  
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.warn('[CardEngine] Magic parse failed, attempting repair...');
    const repaired = repairJson(jsonStr);
    return JSON.parse(repaired);
  }
}
