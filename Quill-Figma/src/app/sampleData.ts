import type { Story, LLMSettings } from './types';

export const DEFAULT_LLM_SETTINGS: LLMSettings = {
  apiUrl: '',
  model: '',
  apiKey: '',
  maxTokens: 1024,
  temperature: 0.85,
};

export const SAMPLE_STORIES: Story[] = [
  {
    id: 'story-1',
    title: 'The Glass Kingdom',
    genres: ['Fantasy', 'Action'],
    pacing: 'Moderate',
    tone: 'atmospheric, epic',
    segments: [
      {
        id: 'seg-1a',
        branchId: 'main',
        type: 'narrative',
        content: `The Glass Kingdom had no doors.\n\nThe citadel rose from the center of the Shattered Sea like a wound in the sky — towers of fused obsidian and quartz that caught the dying light and turned it into something cruel, something beautiful. Lira had spent twenty-three years hearing about it in hushed tones, in the mouths of sailors who'd survived, in the prayers of those who hadn't.\n\nShe stood at the prow of the Saltwind, and for the first time, she understood why people wept when they saw it.`,
        timestamp: '2024-01-15T10:00:00Z',
      },
      {
        id: 'seg-1b',
        branchId: 'main',
        type: 'direction',
        content: 'Have Lira receive a coded message from someone inside the kingdom. Make it cryptic and dangerous.',
        timestamp: '2024-01-15T10:05:00Z',
      },
      {
        id: 'seg-1c',
        branchId: 'main',
        type: 'narrative',
        content: `The message came in the form of a dead gull.\n\nIt landed at her feet with the soft thud of finality, a slip of oilskin tied beneath one wing. Lira crouched, aware of the deck hands watching, and unwrapped it with practiced calm.\n\nThree words, written in the cipher she'd thought only her brother knew:\n\n*The glass breathes.*\n\nHer chest went cold in a way the sea wind couldn't explain.`,
        timestamp: '2024-01-15T10:10:00Z',
      },
    ],
    cards: [
      {
        id: 'card-1a',
        type: 'character',
        title: 'Lira Ashcroft',
        fields: [
          { key: 'Role', value: 'Navigator / Protagonist' },
          { key: 'Age', value: '23' },
          { key: 'Motivation', value: 'Find her missing brother Kael' },
          { key: 'Secret', value: 'She has the Glass Sight — can see through illusions' },
        ],
      },
      {
        id: 'card-1b',
        type: 'character',
        title: 'Captain Theron Voss',
        fields: [
          { key: 'Role', value: 'Ship Captain / Moral grey area' },
          { key: 'Age', value: '41' },
          { key: 'Loyalty', value: 'Unknown — hired by the Queen, loyal to coin' },
        ],
      },
      {
        id: 'card-1c',
        type: 'world',
        title: 'The Shattered Sea',
        fields: [
          { key: 'Description', value: 'Ancient ocean riddled with glass reefs — ruins of the first Glass Kingdom' },
          { key: 'Danger', value: 'Ships that stray off marked lanes are never found' },
          { key: 'Lore', value: 'The sea "sings" during storms — voices of the drowned' },
        ],
      },
    ],
    branches: [
      { id: 'main', label: 'Main Story', parentBranchId: null, forkAtSegmentId: null, createdAt: '2024-01-15T10:00:00Z' },
    ],
    currentBranchId: 'main',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:10:00Z',
  },
  {
    id: 'story-2',
    title: 'Midnight Bargain',
    genres: ['Dark Romance', 'Thriller'],
    pacing: 'Slow Burn',
    tone: 'tense, intoxicating',
    segments: [
      {
        id: 'seg-2a',
        branchId: 'main',
        type: 'narrative',
        content: `She should not have answered the door at midnight.\n\nThis was the rule she'd made for herself after the last time — after Rome, after the fire, after the three months she'd spent convincing herself that forgetting was the same as healing. And yet here she was, hand on the knob, because the knock had been four-two-one, and only one person in the world knew that pattern.\n\n"You look terrible," Nadia said, because it was true, and because she had always believed that honesty was the most dangerous form of intimacy.\n\nAlex didn't answer. Alex just stood there, bleeding from somewhere above the collar, and smiled like he always did — like catastrophe was an old friend he was simply introducing her to.`,
        timestamp: '2024-02-01T22:00:00Z',
      },
      {
        id: 'seg-2b',
        branchId: 'main',
        type: 'direction',
        content: "Nadia lets him in despite herself. Show her internal conflict — she knows this is a mistake but can't help it.",
        timestamp: '2024-02-01T22:05:00Z',
      },
      {
        id: 'seg-2c',
        branchId: 'main',
        type: 'narrative',
        content: `She stepped aside.\n\nThe rational part of her catalogued every reason this was wrong. He was bleeding. He hadn't called. He'd been gone for eight months without a single word, and before that there had been an argument she still hadn't forgiven him for, conducted in four languages across three time zones.\n\nBut his eyes, when they finally met hers, carried that particular exhaustion she recognized from the mirror. The kind that came not from lack of sleep but from carrying something you had no right to put down.\n\n"Just tonight," she said. It was not a question.\n\n"Just tonight," he agreed. It was not an answer.`,
        timestamp: '2024-02-01T22:10:00Z',
      },
    ],
    cards: [
      {
        id: 'card-2a',
        type: 'character',
        title: 'Nadia Voss',
        fields: [
          { key: 'Occupation', value: 'Forensic linguist, freelance' },
          { key: 'Core trait', value: 'Precisely guarded, accidentally perceptive' },
          { key: 'History with Alex', value: 'Former partners — ended badly in Rome' },
        ],
      },
      {
        id: 'card-2b',
        type: 'character',
        title: 'Alex Mercer',
        fields: [
          { key: 'Occupation', value: 'Intelligence contractor (ambiguous allegiance)' },
          { key: 'Core trait', value: 'Charming surface over genuine damage' },
          { key: 'The wound', value: "Bullet graze from job gone wrong — won't explain" },
        ],
      },
      {
        id: 'card-2c',
        type: 'relationship',
        title: 'Nadia & Alex',
        fields: [
          { key: 'Status', value: 'Complicated former intimacy' },
          { key: 'Tension', value: 'She ended it; he let her' },
          { key: 'Unspoken', value: 'Neither has moved on' },
        ],
      },
    ],
    branches: [
      { id: 'main', label: 'Main Story', parentBranchId: null, forkAtSegmentId: null, createdAt: '2024-02-01T22:00:00Z' },
      { id: 'branch-alt', label: 'She Turns Him Away', parentBranchId: 'main', forkAtSegmentId: 'seg-2b', createdAt: '2024-02-01T22:06:00Z' },
    ],
    currentBranchId: 'main',
    createdAt: '2024-02-01T22:00:00Z',
    updatedAt: '2024-02-01T22:10:00Z',
  },
  {
    id: 'story-3',
    title: 'When We Were Stars',
    genres: ['Romance', 'Hurt/Comfort'],
    pacing: 'Natural',
    tone: 'tender, quiet',
    segments: [],
    cards: [],
    branches: [
      { id: 'main', label: 'Main Story', parentBranchId: null, forkAtSegmentId: null, createdAt: '2024-03-10T09:00:00Z' },
    ],
    currentBranchId: 'main',
    createdAt: '2024-03-10T09:00:00Z',
    updatedAt: '2024-03-10T09:00:00Z',
  },
];

const MOCK_RESPONSES = [
  `The silence that followed was its own kind of answer.\n\nShe had learned, over the years, to read the pauses between words as fluently as the words themselves. This one said: *I know. I'm sorry. I have no right to ask.*\n\nShe crossed to the window instead of looking at him. The city below was performing its usual indifference — taxi lights, the distant sound of someone laughing, the particular ache of a world that kept moving without permission.\n\n"There's a kit under the sink," she said finally. "Don't get blood on the good towels."`,
  `Three things happened at once.\n\nThe lantern at the bow guttered and went out. The singing in the water — that low, mournful hum that had been their constant companion since the Threshold Reef — stopped as suddenly as if someone had drawn a curtain across it. And the figure standing at the edge of the crow's nest pointed, without speaking, toward something none of them had expected to find this far from any charted shore.\n\nA light. Single, amber, absolutely still. Burning in the dark like a kept promise.`,
  `She hadn't meant to fall asleep.\n\nBut the chair by his bed was old, and the hospital was warm in that particular way — the kind that discouraged staying awake — and she had been awake for thirty-one hours. When she opened her eyes the morning light had shifted, and there was a paper cup of coffee on the side table that hadn't been there before.\n\nShe looked at him.\n\nHe was watching her with the careful expression he used when he was trying not to let something show.\n\n"You didn't have to—" she started.\n\n"It's just coffee," he said. The way he said it made her certain it wasn't.`,
  `The letter had been written in three different hands.\n\nThe first was steady, formal — the cramped cursive of someone trained to leave nothing to interpretation. The second shifted midway down the page, looser now, almost urgent, the ink pressed harder into the paper as if the writer had leaned in. The third, only four words, was nearly illegible with haste.\n\n*Don't trust the mirror.*\n\nShe read it twice. Then she looked up at the polished glass hanging on the wall of her quarters — the one that had come with the ship, that she'd never thought to question — and wondered, with a cold clarity that had nothing to do with the morning air, what she had been looking at all this time.`,
];

let mockIndex = 0;
export function getMockResponse(): string {
  const r = MOCK_RESPONSES[mockIndex % MOCK_RESPONSES.length];
  mockIndex++;
  return r;
}
