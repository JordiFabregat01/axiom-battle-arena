import type { PackId } from './cards';

export interface DialogueLine { speaker: string; text: string; }

export interface Chapter {
  id: string;
  title: string;
  /** Difficulty band, 1 = Sprout … 7 = Grandmaster. */
  band: number;
  questions: number;
  /** Correct answers needed to clear the chapter. */
  passMark: number;
  intro: DialogueLine[];
  outro: DialogueLine[];
}

export interface QuestLine {
  id: string;
  title: string;
  tagline: string;
  /** Card unlocked by clearing the final chapter. */
  character: string;
  characterName: string;
  setting: string;
  color: string;
  chapters: Chapter[];
}

export interface ChapterReward { coins: number; pack: PackId | null; card: string | null; }

const ch = (id: string, title: string, band: number, intro: DialogueLine[], outro: DialogueLine[], questions = 5, passMark = 3): Chapter =>
  ({ id, title, band, questions, passMark, intro, outro });

const YOU = 'You';

export const QUESTS: QuestLine[] = [
  {
    id: 'scaly-emperor',
    title: 'The Scaly Emperor',
    tagline: 'A dragon’s hoard scattered by a storm, and a very particular way of counting it.',
    character: 'scaly-emperor',
    characterName: 'Draconis',
    setting: 'The Obsidian Vaults',
    color: '#ff5c3a',
    chapters: [
      ch('scattered-hoard', 'The Scattered Hoard', 2, [
        { speaker: 'Draconis', text: 'A storm tore through my vaults last night. Coins in the corridors, scales in the soup. Unacceptable.' },
        { speaker: 'Draconis', text: 'I am told you can count. Prove it, small one, and I may let you leave with your eyebrows.' },
        { speaker: YOU, text: 'Show me the crates.' },
      ], [
        { speaker: 'Draconis', text: 'Hm. Correct. Do not look so pleased; that was the easy corridor.' },
      ]),
      ch('vault-of-crates', 'The Vault of Crates', 3, [
        { speaker: 'Draconis', text: 'The second vault holds crates within crates. The goblins who packed them could not count past six.' },
        { speaker: 'Draconis', text: 'Tell me what is in there, and mind the loose ones on the floor.' },
      ], [
        { speaker: 'Draconis', text: 'Every jar accounted for. The goblins are fired. You are… not fired.' },
      ]),
      ch('archers-ledger', 'The Archers’ Ledger', 4, [
        { speaker: 'Draconis', text: 'My guard captain keeps the ledger in percentages and temperatures. I keep it in scales. We disagree often.' },
        { speaker: 'Draconis', text: 'Settle the ledger. If the captain is wrong, I get to say so at dinner.' },
      ], [
        { speaker: 'Draconis', text: 'The captain was wrong twice. Tonight will be delightful.' },
      ]),
      ch('twin-treasuries', 'The Twin Treasuries', 5, [
        { speaker: 'Draconis', text: 'Two treasuries, built by two architects who hated each other. Nothing about them matches except the totals.' },
        { speaker: 'Draconis', text: 'Find the numbers they hid in the walls. Remainders, sums, differences. Architects are dramatic people.' },
      ], [
        { speaker: 'Draconis', text: 'So that is what they were hiding. I have owned this vault for four hundred years and never asked.' },
      ]),
      ch('emperors-crown', 'The Emperor’s Crown', 6, [
        { speaker: 'Draconis', text: 'The crown has been in my family since before families. Every jewel is set by a rule, and the rule is a puzzle.' },
        { speaker: 'Draconis', text: 'Solve the crown and I will grant you something no dragon has granted: a place in my collection, next to me.' },
        { speaker: YOU, text: 'Let me see the jewels.' },
      ], [
        { speaker: 'Draconis', text: 'The crown is whole. You have the eye of a dragon and the patience of a mountain.' },
        { speaker: 'Draconis', text: 'Take my card. Show it in your spotlight and tell them the Scaly Emperor sent you.' },
      ]),
    ],
  },
  {
    id: 'clockwork-orchard',
    title: 'The Clockwork Orchard',
    tagline: 'A tin gardener whose trees grow in rows and harvest in tables.',
    character: 'clockwork-gardener',
    characterName: 'Tock',
    setting: 'The Brass Terraces',
    color: '#ffb347',
    chapters: [
      ch('first-seeds', 'First Seeds', 1, [
        { speaker: 'Tock', text: 'Tick. Good morning. I am Tock. I plant, I count, I water. Today I have too many seeds and not enough hands.' },
        { speaker: 'Tock', text: 'Would you help me count them into the rows? Tock.' },
      ], [
        { speaker: 'Tock', text: 'Every seed in its place. My gears are humming. Tick, tock, thank you.' },
      ]),
      ch('rows-and-rows', 'Rows and Rows', 2, [
        { speaker: 'Tock', text: 'The trees grew overnight. Rows of them, all the same size. Counting one by one takes until winter.' },
        { speaker: 'Tock', text: 'There must be a faster way. Multiplication, I think it is called. Show me.' },
      ], [
        { speaker: 'Tock', text: 'Rows times trees! I have written it on my chest plate so I never forget.' },
      ]),
      ch('broken-sprinkler', 'The Broken Sprinkler', 3, [
        { speaker: 'Tock', text: 'The sprinkler broke and now some of the trees are dry. I need to know how many are still fine, and how much rope to fix the pipe.' },
        { speaker: 'Tock', text: 'Numbers with several steps. My gears slip on those. Please.' },
      ], [
        { speaker: 'Tock', text: 'The pipe is fixed and the dry trees are counted. Two steps at a time. I can do that now.' },
      ]),
      ch('frost-night', 'The Frost Night', 4, [
        { speaker: 'Tock', text: 'Frost is coming. The temperature falls below zero and I have never counted below zero before. Is that allowed?' },
        { speaker: 'Tock', text: 'Help me plan the covers: percentages of trees, averages of nights, the number that makes the equation true.' },
      ], [
        { speaker: 'Tock', text: 'Below zero is allowed. The orchard survived. So did I, mostly.' },
      ]),
      ch('harvest-gear', 'The Harvest Gear', 5, [
        { speaker: 'Tock', text: 'Harvest day. The great gear must be set so every basket fills evenly. My maker left the settings as riddles.' },
        { speaker: 'Tock', text: 'Solve the riddles and the orchard runs itself. Then I could finally… rest. Tock.' },
      ], [
        { speaker: 'Tock', text: 'The gear turns. The baskets fill. I am going to sit under a tree and do nothing for one whole minute.' },
        { speaker: 'Tock', text: 'Before I do: take my card. A gardener should be in a good collection.' },
      ]),
    ],
  },
  {
    id: 'star-charts',
    title: 'Lyra’s Star Charts',
    tagline: 'A cartographer mapping a sky that refuses to hold still.',
    character: 'lyra-cartographer',
    characterName: 'Lyra',
    setting: 'The Observatory at Ninth Hill',
    color: '#3ee0c7',
    chapters: [
      ch('lantern-map', 'The Lantern Map', 3, [
        { speaker: 'Lyra', text: 'I map stars for a living. Tonight the sky is cloudy, so I am mapping the lanterns of the city instead. Practice.' },
        { speaker: 'Lyra', text: 'Count with me. Rows, crates, the ones the wind blew out.' },
      ], [
        { speaker: 'Lyra', text: 'Neat. If you can count a city you can count a sky.' },
      ]),
      ch('angles-of-sky', 'Angles of the Sky', 4, [
        { speaker: 'Lyra', text: 'Clear night. I measure the sky in squares and angles, and I need the perimeters and the areas to line up.' },
        { speaker: 'Lyra', text: 'One wrong number and a constellation ends up in the sea.' },
      ], [
        { speaker: 'Lyra', text: 'Everything lines up. The Swan stays in the sky where it belongs.' },
      ]),
      ch('comets-return', 'The Comet’s Return', 5, [
        { speaker: 'Lyra', text: 'A comet comes back on a schedule. Two schedules, actually, and they only agree every so often.' },
        { speaker: 'Lyra', text: 'Remainders, sums, differences. Find when they meet and I will know where to point the telescope.' },
      ], [
        { speaker: 'Lyra', text: 'There it is. Right on the number you gave me. I could cry, but the lens would fog.' },
      ]),
      ch('counting-constellations', 'Counting Constellations', 6, [
        { speaker: 'Lyra', text: 'How many ways can you join stars into shapes? More than you would think. The atlas has a page for every one.' },
        { speaker: 'Lyra', text: 'Choices, handshakes, diagonals. Combinatorics, the astronomers call it. I call it Tuesday.' },
      ], [
        { speaker: 'Lyra', text: 'The atlas has its page count. The printer will be furious.' },
      ]),
      ch('infinite-atlas', 'The Infinite Atlas', 7, [
        { speaker: 'Lyra', text: 'The last page of the atlas is about things that do not end. Powers, divisors, paths through a grid of stars.' },
        { speaker: 'Lyra', text: 'Finish it with me. Then I will draw you into the margin, which is where cartographers keep their friends.' },
        { speaker: YOU, text: 'Hand me the pen.' },
      ], [
        { speaker: 'Lyra', text: 'Done. The atlas is complete, or as complete as an infinite thing gets.' },
        { speaker: 'Lyra', text: 'My card is yours. Put me in your spotlight, and somewhere near the top; I like a view.' },
      ]),
    ],
  },
];

export const questById = (id: string) => QUESTS.find((q) => q.id === id);

/** First-clear rewards scale with the chapter's difficulty. The final chapter also unlocks the character. */
export function chapterReward(quest: QuestLine, chapterIndex: number): ChapterReward {
  const chapter = quest.chapters[chapterIndex];
  const last = chapterIndex === quest.chapters.length - 1;
  return {
    coins: 40 * chapter.band + 20 + (last ? 200 : 0),
    pack: last ? 'premium' : 'standard',
    card: last ? quest.character : null,
  };
}

/** Replaying a cleared chapter still pays a little. */
export const REPLAY_COIN_SHARE = 0.2;
