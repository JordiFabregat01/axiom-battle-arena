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
    title: 'The Clockwork Oasis',
    tagline: 'A dune wanderer who counts everything, and a brass orchard buried in the sand.',
    character: 'clockwork',
    characterName: 'Clockwork',
    setting: 'The Singing Dunes',
    color: '#ffb347',
    chapters: [
      ch('first-footprints', 'First Footprints', 1, [
        { speaker: 'Clockwork', text: 'They call me Clockwork because I count. Steps, stars, sips of water. Out here, losing count is how you die.' },
        { speaker: 'Clockwork', text: 'I found something under the dunes: brass trees, in rows, still ticking. Help me count what the sand left us.' },
        { speaker: YOU, text: 'Lead the way.' },
      ], [
        { speaker: 'Clockwork', text: 'Good. Every seed accounted for. The desert respects a careful counter.' },
      ]),
      ch('rows-of-brass', 'Rows of Brass', 2, [
        { speaker: 'Clockwork', text: 'The trees stand in rows, each row the same. Counting one by one takes until the moon; I have watched the moon enough.' },
        { speaker: 'Clockwork', text: 'Rows times trees. Show me the fast way and we drink before dark.' },
      ], [
        { speaker: 'Clockwork', text: 'Rows times trees. I have scratched it on my staff so the wind cannot take it.' },
      ]),
      ch('broken-channel', 'The Broken Channel', 3, [
        { speaker: 'Clockwork', text: 'A water channel feeds the oasis and the sand has cracked it. Some trees are dry; some pipe still needs rope.' },
        { speaker: 'Clockwork', text: 'Two steps at a time, counter. Crates and loose jars, rope and pieces.' },
      ], [
        { speaker: 'Clockwork', text: 'Channel mended, dry trees counted. Two steps at a time. I can walk like that.' },
      ]),
      ch('cold-night', 'The Cold Night', 4, [
        { speaker: 'Clockwork', text: 'Deserts freeze at night. The number falls below nothing and keeps falling. I never had a word for that.' },
        { speaker: 'Clockwork', text: 'Plan the covers with me: shares of the trees, averages of the nights, the number that makes the equation true.' },
      ], [
        { speaker: 'Clockwork', text: 'Below nothing is allowed. The oasis lived through the cold. So did we.' },
      ]),
      ch('harvest-gear', 'The Harvest Gear', 5, [
        { speaker: 'Clockwork', text: 'At the heart of the oasis is a great gear. Whoever built it left the settings as riddles, and the settings decide who eats.' },
        { speaker: 'Clockwork', text: 'Solve them and the oasis runs itself. Then I can finally stop counting for one night.' },
      ], [
        { speaker: 'Clockwork', text: 'The gear turns. The baskets fill. Tonight I count nothing at all.' },
        { speaker: 'Clockwork', text: 'Take my card, counter. A wanderer should sit in a good collection.' },
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
