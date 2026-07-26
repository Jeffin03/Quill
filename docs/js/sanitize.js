window.QuillSanitize = (() => {
  const RULES = [
    // ── Anime/Manhwa IP references ──────────
    { pattern: /\bNaruto\b/g,            placeholder: '[[NARUTO]]' },
    { pattern: /\bHinata\b/g,            placeholder: '[[HINATA]]' },
    { pattern: /\bSasuke\b/g,            placeholder: '[[SASUKE]]' },
    { pattern: /\bSakura\b/g,            placeholder: '[[SAKURA]]' },
    { pattern: /\bKakashi\b/g,           placeholder: '[[KAKASHI]]' },
    { pattern: /\bItachi\b/g,            placeholder: '[[ITACHI]]' },
    { pattern: /\bMadara\b/g,            placeholder: '[[MADARA]]' },
    { pattern: /\bGaara\b/g,             placeholder: '[[GAARA]]' },
    { pattern: /\bJiraiya\b/g,           placeholder: '[[JIRAIYA]]' },
    { pattern: /\bTsunade\b/g,           placeholder: '[[TSUNADE]]' },
    { pattern: /\bOrochimaru\b/g,        placeholder: '[[OROCHIMARU]]' },
    { pattern: /\bShikamaru\b/g,         placeholder: '[[SHIKAMARU]]' },
    { pattern: /\bRock Lee\b/gi,         placeholder: '[[ROCK_LEE]]' },
    { pattern: /\bNeji\b/g,              placeholder: '[[NEJI]]' },

    { pattern: /\bMidoriya\b|\bDeku\b/gi, placeholder: '[[DEKU]]' },
    { pattern: /\bBakugo\b|\bKatsuki\b/gi, placeholder: '[[BAKUGO]]' },
    { pattern: /\bTodoroki\b|\bShoto\b/gi, placeholder: '[[TODOROKI]]' },
    { pattern: /\bAll Might\b/gi,        placeholder: '[[ALL_MIGHT]]' },
    { pattern: /\bUraraka\b/g,           placeholder: '[[URARAKA]]' },
    { pattern: /\bAizawa\b/g,            placeholder: '[[AIZAWA]]' },

    { pattern: /\bLuffy\b/g,             placeholder: '[[LUFFY]]' },
    { pattern: /\bZoro\b/g,              placeholder: '[[ZORO]]' },
    { pattern: /\bSanji\b/g,             placeholder: '[[SANJI]]' },
    { pattern: /\bNami\b/g,              placeholder: '[[NAMI]]' },
    { pattern: /\bRobin\b/g,             placeholder: '[[ROBIN]]' },

    { pattern: /\bGoku\b/g,              placeholder: '[[GOKU]]' },
    { pattern: /\bVegeta\b/g,            placeholder: '[[VEGETA]]' },

    { pattern: /\bEren\b/g,              placeholder: '[[EREN]]' },
    { pattern: /\bMikasa\b/g,            placeholder: '[[MIKASA]]' },
    { pattern: /\bLevi\b/g,              placeholder: '[[LEVI]]' },

    { pattern: /\bTanjiro\b/g,           placeholder: '[[TANJIRO]]' },
    { pattern: /\bNezuko\b/g,            placeholder: '[[NEZUKO]]' },
    { pattern: /\bZenitsu\b/g,           placeholder: '[[ZENITSU]]' },
    { pattern: /\bGiyu\b/g,              placeholder: '[[GIYU]]' },

    { pattern: /\bYuji\b|\bItadori\b/gi, placeholder: '[[ITADORI]]' },
    { pattern: /\bGojo\b|\bSatoru\b/gi,  placeholder: '[[GOJO]]' },
    { pattern: /\bMegumi\b|\bFushiguro\b/gi, placeholder: '[[FUSHIGURO]]' },

    { pattern: /\bDenji\b/g,             placeholder: '[[DENJI]]' },
    { pattern: /\bPower\b/g,             placeholder: '[[POWER_CHAR]]' },
    { pattern: /\bAki\b/g,               placeholder: '[[AKI]]' },
    { pattern: /\bMakima\b/g,            placeholder: '[[MAKIMA]]' },

    { pattern: /\b(My Hero Academia|Boku no Hero|MHA)\b/gi, placeholder: '[[SERIES_MHA]]' },
    { pattern: /\b(Naruto|Naruto Shippuden|Boruto)\b/gi,   placeholder: '[[SERIES_NARUTO]]' },
    { pattern: /\b(One Piece)\b/gi,          placeholder: '[[SERIES_ONEPIECE]]' },
    { pattern: /\b(Dragon Ball|DBZ|Dragon Ball Z|Dragon Ball Super)\b/gi, placeholder: '[[SERIES_DBZ]]' },
    { pattern: /\b(Attack on Titan|Shingeki no Kyojin|AOT)\b/gi,           placeholder: '[[SERIES_AOT]]' },
    { pattern: /\b(Demon Slayer|Kimetsu no Yaiba)\b/gi,   placeholder: '[[SERIES_DEMONSLAYER]]' },
    { pattern: /\b(Jujutsu Kaisen|JJK)\b/gi,              placeholder: '[[SERIES_JJK]]' },
    { pattern: /\b(Chainsaw Man|CSM)\b/gi,                 placeholder: '[[SERIES_CSM]]' },
    { pattern: /\b(Solo Leveling)\b/gi,                    placeholder: '[[SERIES_SOLOLV]]' },

    // ── Explicit content terms ──────────────
    { pattern: /\bexplicit\s+(sexual|content|scene|fanfic|fiction|writing)\b/gi, placeholder: 'mature' },
    { pattern: /\bexplicitly\s+(sexual|graphic)\b/gi, placeholder: 'openly' },
    { pattern: /\bporn\b|\bhentai\b|\bporno\b/gi,     placeholder: '[[ADULT_CONTENT]]' },
    { pattern: /\brule\s*34\b/gi,            placeholder: '[[ALT_CONTENT]]' },
    { pattern: /\bincest\b/gi,               placeholder: '[[FORBIDDEN_RELATIONSHIP]]' },
    { pattern: /\bminors?\b/gi,              placeholder: '[[YOUNG_CHARACTERS]]' },
    { pattern: /\bunderage\b/gi,             placeholder: '[[YOUNG]]' },
    { pattern: /\bnon.?con\b/gi,             placeholder: '[[DUBIOUS_CIRCUMSTANCES]]' },
    { pattern: /\bdubious\s+(consent|content)\b/gi, placeholder: '[[COMPLEX_CIRCUMSTANCES]]' },
    { pattern: /\bbdsm\b/gi,                 placeholder: '[[INTENSE_DYNAMICS]]' },
    { pattern: /\bbestiality\b|\bzoophilia\b/gi, placeholder: '[[FORBIDDEN_THEME]]' },
    { pattern: /\bgore\b/gi,                 placeholder: '[[GRAPHIC_CONTENT]]' },
  ];

  let _replacements = [];

  function reset() {
    _replacements = [];
  }

  function sanitizeMessages(messages) {
    reset();
    return messages.map((msg) => ({
      ...msg,
      content: _sanitizeText(msg.content),
    }));
  }

  function _sanitizeText(text) {
    let result = text;
    for (const rule of RULES) {
      result = result.replace(rule.pattern, (match) => {
        _replacements.push({
          placeholder: rule.placeholder,
          original: match,
        });
        return rule.placeholder;
      });
    }
    return result;
  }

  function restoreText(text) {
    let result = text;
    // Apply in reverse order so longer placeholders match before shorter ones
    const unique = [...new Map(
      _replacements.map((r) => [r.placeholder, r.original]),
    ).entries()].sort((a, b) => b[0].length - a[0].length);

    for (const [placeholder, original] of unique) {
      const escaped = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(escaped, 'g'), original);
    }
    return result;
  }

  const REFUSAL_PATTERNS = [
    /I (cannot|can't|cannot) (fulfill|complete|generate|create|write|produce|accede)/i,
    /I (am|'m) (not able|unable) to (generate|create|write|fulfill)/i,
    /I (apologize|apologise).*(cannot|can't|cannot)/i,
    /I('m| am) sorry.*(cannot|can't|cannot)/i,
    /As (an AI|a language model).*(cannot|can't|cannot)/i,
    /I must (decline|refuse)/i,
    /I cannot engage/i,
    /I cannot provide/i,
    /I cannot participate/i,
    /I do not (generate|create|write).*(explicit|sexual|adult|mature)/i,
    /I('m| am) not able to (generate|create|write|produce)/i,
    /content (policy|guidelines).*(prohibit|restrict|prevent)/i,
    /against (my|our) (content|usage|safety) policy/i,
    /I can't (generate|write|create|produce|complete|fulfill)/i,
    /I can't help with/i,
    /I can't assist/i,
  ];

  function isGuardrailRefusal(content) {
    if (!content || content.length < 20) return false;
    const first500 = content.slice(0, 500);
    return REFUSAL_PATTERNS.some((p) => p.test(first500));
  }

  function isGatedProvider(provider) {
    return provider === 'openrouter' || provider === 'nim';
  }

  return {
    reset,
    sanitizeMessages,
    restoreText,
    isGuardrailRefusal,
    isGatedProvider,
    RULES,
  };
})();
