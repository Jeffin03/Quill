/* ══════════════════════════════════════════
   Quill — Client-Side Card Engine
   Ported from server/services/cardEngine.js.
   Handles parsing card updates from LLM
   responses and auto-generation from premise.
   ══════════════════════════════════════════ */

window.QuillCardEngine = (() => {
  const CARD_BLOCK_REGEX =
    /\[\[\[QUILL_CARDS_START\]\]\]\s*([\s\S]*?)\s*(?:\[\[\[QUILL_CARDS_END\]\]\]|$)/;

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
      console.warn("[CardEngine] JSON parse failed, attempting repair...", e.message);
      try {
        const repaired = repairJson(jsonStr);
        return JSON.parse(repaired);
      } catch (e2) {
        console.error("[CardEngine] Failed to repair JSON:", e2.message);
        QuillToast?.show?.("Failed to parse card updates from AI response", "error");
        return [];
      }
    }
  }

  /**
   * Strip the card block from the response, returning prose only.
   */
  function stripCardBlock(rawResponse) {
    return rawResponse.replace(CARD_BLOCK_REGEX, "").trim();
  }

  /**
   * Apply card update operations to the existing cards array.
   * Returns a new array with updates applied.
   */
  function applyCardUpdates(existingCards, updates) {
    if (!updates || updates.length === 0) return existingCards;

    const cards = existingCards.map((c) => ({ ...c }));

    for (const update of updates) {
      switch (update.action) {
        case "create": {
          cards.push({
            id: QuillUtils.uuid(),
            type: update.type || "world",
            title: update.title || "Untitled Card",
            fields: update.fields || {},
            lastUpdated: new Date().toISOString(),
          });
          break;
        }
        case "update": {
          const idx = cards.findIndex(
            (c) => c.title === update.title || c.id === update.id,
          );
          if (idx !== -1) {
            cards[idx] = {
              ...cards[idx],
              fields: { ...cards[idx].fields, ...(update.fields || {}) },
              lastUpdated: new Date().toISOString(),
            };
          }
          break;
        }
        case "delete": {
          const idx = cards.findIndex(
            (c) => c.title === update.title || c.id === update.id,
          );
          if (idx !== -1) cards.splice(idx, 1);
          break;
        }
        default:
          console.warn("[CardEngine] Unknown card action:", update.action);
      }
    }

    return cards;
  }

  /**
   * Auto-generate cards from a premise string using the LLM.
   */
  async function generateCardsFromPremise(existingCards, premise) {
    const systemPrompt =
      "You are a JSON-only generator. Given a story premise, output a JSON object with a \"cards\" key containing an array of context cards. " +
      "Your entire response must be valid JSON and nothing else. Example: " +
      '{"cards":[{"action":"create","type":"character","title":"Eren","fields":{"name":"Eren","age":"15","appearance":"brown hair","personality":"determined","role":"protagonist","status":"active"}}]}';

    const messages = [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content:
          "Output context cards for the following story premise. Respond with a JSON object containing a \"cards\" key. " +
          "Valid types: character, relationship, world, plot, arc. " +
          "Each card must have: action (create/update/delete), type, title, fields (object with keys specific to the type). " +
          "Generate 3-8 cards.\n\nPremise:\n" +
          premise,
      },
    ];

    let rawJson = "";
    try {
      rawJson = await QuillLLM.chat(messages, {
        temperature: 0,
        maxTokens: 4096,
        responseFormat: "json",
      });
    } catch (err) {
      // If the API rejected response_format (e.g. older Ollama), retry without it
      if (err.message?.includes("400") || err.message?.includes("response_format")) {
        console.debug("[CardEngine] JSON mode not supported, retrying without it");
        try {
          rawJson = await QuillLLM.chat(messages, {
            temperature: 0,
            maxTokens: 4096,
          });
        } catch (err2) {
          console.error("[CardEngine] Auto generation failed:", err2);
          throw err2;
        }
      } else {
        console.error("[CardEngine] Auto generation failed:", err);
        throw err;
      }
    }

    // Strip markdown fences
    rawJson = rawJson
      .replace(/```json\n?/gi, "")
      .replace(/```\n?/gi, "")
      .trim();

    // If the response isn't pure JSON, try to extract a JSON object { }
    if (!rawJson.startsWith("{")) {
      const objStart = rawJson.indexOf("{");
      const objEnd = rawJson.lastIndexOf("}");
      if (objStart !== -1 && objEnd > objStart) {
        rawJson = rawJson.substring(objStart, objEnd + 1);
      }
    }

    let parsed;
    try {
      parsed = JSON.parse(rawJson);
    } catch (e) {
      console.debug("[CardEngine] Initial parse failed, attempting repair:", e.message);
      const repaired = repairJson(rawJson);
      try {
        parsed = JSON.parse(repaired);
        console.debug("[CardEngine] Repair succeeded (likely truncated response)");
      } catch (e2) {
        console.error("[CardEngine] Deep repair failed:", e2.message);
        console.error("[CardEngine] Raw:", rawJson.slice(0, 400));
        console.error("[CardEngine] Repaired:", repaired.slice(0, 500));
        throw new Error(
          "AI response was not JSON. The model may not support structured output.",
        );
      }
    }

    // If wrapped in {"cards": [...]} or similar, extract the array
    const cards = parsed?.cards || parsed;
    if (!Array.isArray(cards)) {
      throw new Error("AI response did not contain a cards array.");
    }
    return applyCardUpdates(existingCards, cards);
  }

  /**
   * Robust JSON repair for LLM-generated data.
   */
  function repairJson(str) {
    let s = str.trim();

    // 0. Strip trailing commas first so subsequent steps don't trip on them
    s = s.replace(/,\s*([\}\]])/g, "$1");

    // 1. Handle JS object shorthand: {name, age, role} -> {"name":"","age":"","role":""}
    //    This happens when models copy the field-list notation from the prompt literally.
    s = s.replace(
      /\{\s*([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)\s*\}/g,
      (match, inner) => {
        const keys = inner.split(",").map((k) => k.trim()).filter(Boolean);
        if (keys.length === 0) return match;
        return "{" + keys.map((k) => `"${k}":""`).join(",") + "}";
      },
    );

    // 2. Fix unquoted keys (e.g. {title: "..."} -> {"title": "..."})
    s = s.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');

    // 3. Fix single-quoted values: replace 'value' with "value"
    //    but only around complete tokens (not inside words, avoiding apostrophes)
    s = s.replace(/:\s*'([^']*)'/g, ': "$1"');

    // 4. Fix bare unquoted string values: "key": bare_word -> "key": "bare_word"
    //     Values end at , } ] or end-of-string. Skip valid JSON primitives.
    s = s.replace(
      /(":\s*)([a-zA-Z_][a-zA-Z0-9_ .!?'-]*[a-zA-Z0-9_.!?'-])(?=\s*[,\}\]])/g,
      (match, prefix, value) => {
        if (/^(true|false|null|\d+\.?\d*)$/.test(value)) return match;
        return prefix + '"' + value + '"';
      },
    );

    // 5. Insert missing commas between adjacent values
    //    "value" "key": -> "value","key":
    s = s.replace(/"\s+"/g, '","');
    //    } "key": -> },"key":
    s = s.replace(/}\s*"/g, '},"');
    //    ] "key": -> ],"key":
    s = s.replace(/]\s*"/g, '],"');
    //    } unquoted_key: -> },"unquoted_key":
    s = s.replace(/}\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '},"$1":');

    // 6. Remove trailing commas again (new ones may have been created above)
    s = s.replace(/,\s*([\}\]])/g, "$1");

    // 7. Close unclosed strings (close unclosed quotes)
    const quoteCount = (s.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) s += '"';

    // 8. Walk the string character-by-character to count only
    //    STRUCTURAL braces/brackets (not ones inside string values).
    //    This prevents ] or } inside prose/truncated strings from
    //    throwing off the count.
    let inString = false;
    let structOpenBraces = 0;
    let structCloseBraces = 0;
    let structOpenBrackets = 0;
    let structCloseBrackets = 0;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '\\') { i++; continue; } // skip escaped char (e.g. \")
      if (ch === '"') inString = !inString;
      if (inString) continue;
      if (ch === '{') structOpenBraces++;
      if (ch === '}') structCloseBraces++;
      if (ch === '[') structOpenBrackets++;
      if (ch === ']') structCloseBrackets++;
    }
    for (let i = 0; i < structOpenBraces - structCloseBraces; i++) s += "}";
    for (let i = 0; i < structOpenBrackets - structCloseBrackets; i++) s += "]";

    return s;
  }

  return {
    parseCardUpdates,
    stripCardBlock,
    applyCardUpdates,
    generateCardsFromPremise,
  };
})();
