/**
 * Prompt Builder — assembles the system prompt from story settings and context cards,
 * and builds the message array for LLM calls.
 */

/**
 * Build the full system prompt incorporating story settings and context cards.
 */
export function buildSystemPrompt(story) {
  const { settings, cards } = story;

  return `You are a collaborative fiction writer working with a director. Your sole purpose is to write immersive, well-paced prose that follows the director's creative vision exactly. You are not an assistant — you are a co-author.

## Story Settings
- Genre: ${settings?.genre || 'general fiction'}
- Pacing: ${settings?.pacing || 'natural'}
- Tone: ${settings?.tone || 'atmospheric, engaging'}

## Writing Style
- Write in third person, past tense unless the director specifies otherwise
- Be descriptive and atmospheric — paint the scene with sensory details
- Show, don't tell — convey emotions through actions, body language, micro-expressions, and subtext
- Write dialogue that feels natural and reveals character
- Each response should be 300-800 words unless directed otherwise
- NEVER break character, add commentary, or address the director directly — only write prose

${getPacingDirective(settings?.pacing)}

## Current Story State
${formatCards(cards)}

## Critical Rules
1. Respect ALL context cards — they are the absolute source of truth for this story
2. Do NOT skip ahead in the timeline unless explicitly directed to
3. Do NOT resolve tension prematurely — let it build according to the pacing directive
4. Do NOT introduce major plot events without the director's guidance
5. Stay consistent with established character voices, mannerisms, and emotional states
6. When the director gives a scene setup, flesh it out with rich detail — don't just summarize

## Context Card Updates
After writing your prose, you MUST output updates to the story's context cards. This section MUST start with [[[QUILL_CARDS_START]]] and end with [[[QUILL_CARDS_END]]]. This section will be automatically parsed and hidden from view.

Do NOT include any introductory text or commentary before the opening tag.

[[[QUILL_CARDS_START]]]
[
  {"action": "create", "type": "character|relationship|plot|world|arc", "title": "Card Title", "fields": {"key": "value"}},
  {"action": "update", "id": "existing-card-id", "fields": {"field_name": "new_value"}},
  {"action": "delete", "id": "card-id-to-remove"}
]
[[[QUILL_CARDS_END]]]

Rules for card updates:
- ONLY include cards that have NEW information or have CHANGED in this scene.
- Do NOT re-list unchanged cards. If nothing changed, output exactly: [[[QUILL_CARDS_START]]][][[[QUILL_CARDS_END]]]
- For new characters, include: appearance, personality, emotional_state, role.
- For new relationships, include: dynamic, tension_level, history.
- Keep field values concise (1-2 sentences).`;
}

function getPacingDirective(pacing) {
  const directives = {
    'slow-burn': `## 🔥 Pacing Directive: SLOW BURN
This story is a SLOW BURN. This is sacred. Every scene should add layers, not leaps.
- Build tension through proximity, unspoken words, lingering glances, almost-touches
- Do NOT rush to confessions, confrontations, or intimate scenes
- Silence and subtext are your most powerful tools
- Let small gestures carry enormous weight — a brush of fingers, a held gaze, a name spoken softly
- The audience craves the buildup — make them ACHE for what's coming
- When in doubt, pull back. The payoff must be EARNED.`,

    'moderate': `## ⚡ Pacing Directive: MODERATE
Balance between buildup and progression.
- Allow natural development without dragging scenes
- Key moments can happen when the groundwork has been properly laid
- Mix tension-building scenes with moments of progression
- Don't rush, but don't stall — keep the reader engaged.`,

    'fast': `## 🚀 Pacing Directive: FAST
Keep the momentum high and the scenes punchy.
- Cut to the action — don't linger on extended setup
- Dialogue should be sharp and purposeful
- Events can escalate quickly when it serves the story
- Still maintain emotional coherence — fast doesn't mean shallow.`,

    'natural': `## 🌊 Pacing Directive: NATURAL
Let the story flow organically.
- Some scenes should breathe and linger, others should punch and move
- Read the director's intent and match the energy they're setting
- Trust the rhythm of the narrative.`,
  };
  return directives[pacing] || directives['natural'];
}

function formatCards(cards) {
  if (!cards || cards.length === 0) {
    return 'No context cards yet — this is the beginning of the story. Create cards for any characters, relationships, or plot elements as they are introduced.';
  }

  const grouped = {};
  for (const card of cards) {
    if (!grouped[card.type]) grouped[card.type] = [];
    grouped[card.type].push(card);
  }

  let formatted = '';
  const typeLabels = {
    character: '👤 Characters',
    relationship: '💞 Relationships',
    plot: '📖 Plot Threads',
    world: '🌍 World & Setting',
    arc: '📐 Story Arc',
  };

  for (const [type, typeCards] of Object.entries(grouped)) {
    formatted += `\n### ${typeLabels[type] || type}\n`;
    for (const card of typeCards) {
      formatted += `\n**${card.title}** (id: ${card.id})\n`;
      for (const [key, value] of Object.entries(card.fields || {})) {
        formatted += `- ${key}: ${value}\n`;
      }
    }
  }

  return formatted;
}

/**
 * Build the messages array for the LLM call.
 * Includes system prompt + recent message history.
 */
export function buildMessages(story) {
  const systemPrompt = buildSystemPrompt(story);

  const messages = [
    { role: 'system', content: systemPrompt },
  ];

  // Include recent message history — limit to last 30 to manage context window
  // The context cards carry the long-term memory, so we don't need all history
  const maxHistory = 30;
  const recentMessages = story.messages.slice(-maxHistory);
  for (const msg of recentMessages) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  return messages;
}
