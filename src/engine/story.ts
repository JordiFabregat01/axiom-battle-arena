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
  /** Card unlocked by clearing the final chapter (a `_Q` card in public/cards). */
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
    tagline: 'An emperor without a throne, a hoard under the sand, and a very particular way of counting it.',
    character: 'scaly-emperor',
    characterName: 'Draconis',
    setting: 'The Sunken Vaults',
    color: '#ff5c3a',
    chapters: [
      ch('scattered-hoard', 'The Scattered Hoard', 2, [
        { speaker: 'Draconis', text: 'You see rags. I see an emperor. A sandstorm took my palace, my vaults and, worst of all, my count.' },
        { speaker: 'Draconis', text: 'I am told you can count. Prove it, small one, and I may let you leave the dunes with your eyebrows.' },
        { speaker: YOU, text: 'Show me what the sand left.' },
      ], [
        { speaker: 'Draconis', text: 'Hm. Correct. Do not look so pleased; that was the shallow end of the sand.' },
      ]),
      ch('vault-of-crates', 'The Vault of Crates', 3, [
        { speaker: 'Draconis', text: 'The first vault is still down there: crates within crates. The goblins who packed them could not count past six.' },
        { speaker: 'Draconis', text: 'Tell me what is in it, and mind the loose jars in the sand.' },
      ], [
        { speaker: 'Draconis', text: 'Every jar accounted for. The goblins were fired years ago. You are… not fired.' },
      ]),
      ch('archers-ledger', 'The Archers’ Ledger', 4, [
        { speaker: 'Draconis', text: 'My old guard captain kept the ledger in percentages and desert temperatures. I kept it in scales. We disagreed often.' },
        { speaker: 'Draconis', text: 'Settle the ledger. If the captain was wrong, I get to say so around the fire tonight.' },
      ], [
        { speaker: 'Draconis', text: 'The captain was wrong twice. Tonight will be delightful.' },
      ]),
      ch('twin-treasuries', 'The Twin Treasuries', 5, [
        { speaker: 'Draconis', text: 'Two treasuries, built by two architects who hated each other. Nothing about them matches except the totals.' },
        { speaker: 'Draconis', text: 'Find the numbers they hid in the walls. Remainders, sums, differences. Architects are dramatic people.' },
      ], [
        { speaker: 'Draconis', text: 'So that is what they were hiding. I ruled over those vaults for four hundred years and never asked.' },
      ]),
      ch('emperors-crown', 'The Emperor’s Crown', 6, [
        { speaker: 'Draconis', text: 'The crown is the last thing I carry. Every jewel is set by a rule, and the rule is a puzzle. Solve it and the empire is counted again.' },
        { speaker: 'Draconis', text: 'Do that and I grant what no dragon has granted: a place in your collection, next to you.' },
        { speaker: YOU, text: 'Let me see the jewels.' },
      ], [
        { speaker: 'Draconis', text: 'The crown is whole. You have the eye of a dragon and the patience of a dune.' },
        { speaker: 'Draconis', text: 'Take my card. Show it in your spotlight and tell them the Scaly Emperor sent you.' },
      ]),
    ],
  },
  {
    id: 'clockwork-orchard',
    title: 'The Clockwork Tower',
    tagline: 'An automaton chained inside a broken clock, and gears that have lost their count.',
    character: 'clockwork',
    characterName: 'Clockwork',
    setting: 'The Tower of the Broken Hour',
    color: '#ffb347',
    chapters: [
      ch('waking-the-gears', 'Waking the Gears', 1, [
        { speaker: 'Clockwork', text: 'Tick. You came up the stairs. Nobody comes up the stairs. I am the clock, or what is left of it.' },
        { speaker: 'Clockwork', text: 'The great wheel stopped when the count was lost. Start small with me: cogs, pins, the teeth on a gear.' },
        { speaker: YOU, text: 'Show me the smallest wheel.' },
      ], [
        { speaker: 'Clockwork', text: 'Every tooth accounted for. Something in my chest moved. I think it was a second.' },
      ]),
      ch('rows-of-cogs', 'Rows of Cogs', 2, [
        { speaker: 'Clockwork', text: 'The gear racks run in rows, each row the same. Counting one by one takes until midnight, and midnight never comes here.' },
        { speaker: 'Clockwork', text: 'Rows times cogs. Show me the fast way and I will show you the minute hand.' },
      ], [
        { speaker: 'Clockwork', text: 'Rows times cogs. I have etched it on the dial so the rust cannot take it.' },
      ]),
      ch('broken-chain', 'The Broken Chain', 3, [
        { speaker: 'Clockwork', text: 'A chain runs from the bell to the wheel and half its links are on the floor. Some pieces fit; some are loose.' },
        { speaker: 'Clockwork', text: 'Two steps at a time, counter. Racks and loose links, rope and pieces.' },
      ], [
        { speaker: 'Clockwork', text: 'Chain mended. Two steps at a time. I can move like that.' },
      ]),
      ch('frozen-bell', 'The Frozen Bell', 4, [
        { speaker: 'Clockwork', text: 'The tower freezes at night. The number on the gauge falls below nothing and keeps falling. I never had a word for that.' },
        { speaker: 'Clockwork', text: 'Help me plan the furnace: shares of the coal, averages of the nights, the number that makes the equation true.' },
      ], [
        { speaker: 'Clockwork', text: 'Below nothing is allowed. The bell did not crack. Neither did I, mostly.' },
      ]),
      ch('great-escapement', 'The Great Escapement', 5, [
        { speaker: 'Clockwork', text: 'At the heart of the clock is the escapement, and whoever built me left its settings as riddles. Wrong settings and the hour never strikes.' },
        { speaker: 'Clockwork', text: 'Solve them and the tower keeps time on its own. Then I can stop counting, for one whole hour.' },
      ], [
        { speaker: 'Clockwork', text: 'The wheel turns. The bell rang twelve. I heard it end.' },
        { speaker: 'Clockwork', text: 'Take my card, counter. A clock should stand in a good collection.' },
      ]),
    ],
  },
  {
    id: 'star-charts',
    title: 'Lydia’s Star Charts',
    tagline: 'A young cartographer mapping a sky that refuses to hold still.',
    character: 'lydia',
    characterName: 'Lydia',
    setting: 'The Moonlit Battlements',
    color: '#3ee0c7',
    chapters: [
      ch('lantern-map', 'The Lantern Map', 3, [
        { speaker: 'Lydia', text: 'I map stars for a living. Tonight the sky is cloudy, so I am mapping the lanterns of the city instead. Practice.' },
        { speaker: 'Lydia', text: 'Count with me. Rows, crates, the ones the wind blew out.' },
      ], [
        { speaker: 'Lydia', text: 'Neat. If you can count a city you can count a sky.' },
      ]),
      ch('angles-of-sky', 'Angles of the Sky', 4, [
        { speaker: 'Lydia', text: 'Clear night. I measure the sky in squares and angles, and I need the perimeters and the areas to line up.' },
        { speaker: 'Lydia', text: 'One wrong number and a constellation ends up in the sea.' },
      ], [
        { speaker: 'Lydia', text: 'Everything lines up. The Swan stays in the sky where it belongs.' },
      ]),
      ch('comets-return', 'The Comet’s Return', 5, [
        { speaker: 'Lydia', text: 'A comet comes back on a schedule. Two schedules, actually, and they only agree every so often.' },
        { speaker: 'Lydia', text: 'Remainders, sums, differences. Find when they meet and I will know where to point the staff.' },
      ], [
        { speaker: 'Lydia', text: 'There it is. Right on the number you gave me. I could cry, but the crystal would fog.' },
      ]),
      ch('counting-constellations', 'Counting Constellations', 6, [
        { speaker: 'Lydia', text: 'How many ways can you join stars into shapes? More than you would think. The atlas has a page for every one.' },
        { speaker: 'Lydia', text: 'Choices, handshakes, diagonals. Combinatorics, the astronomers call it. I call it Tuesday.' },
      ], [
        { speaker: 'Lydia', text: 'The atlas has its page count. The printer will be furious.' },
      ]),
      ch('infinite-atlas', 'The Infinite Atlas', 7, [
        { speaker: 'Lydia', text: 'The last page of the atlas is about things that do not end. Powers, divisors, paths through a grid of stars.' },
        { speaker: 'Lydia', text: 'Finish it with me. Then I will draw you into the margin, which is where cartographers keep their friends.' },
        { speaker: YOU, text: 'Hand me the pen.' },
      ], [
        { speaker: 'Lydia', text: 'Done. The atlas is complete, or as complete as an infinite thing gets.' },
        { speaker: 'Lydia', text: 'My card is yours. Put me in your spotlight, and somewhere near the top; I like a view.' },
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
