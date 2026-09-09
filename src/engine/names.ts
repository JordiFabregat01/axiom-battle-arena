/** Usernames: the rules are the same everywhere (browser validation, server enforcement). */

export const NAME_MIN = 3;
export const NAME_MAX = 16;
/** Starts with a letter; letters, digits and underscores; 3–16 characters. */
export const NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{2,15}$/;
export const NAME_RULES = 'Letters, numbers and underscores; 3 to 16 characters; must start with a letter. Names are unique: first come, first served.';

const RESERVED = new Set(['admin', 'administrator', 'moderator', 'mod', 'axiom', 'axiomarena', 'axiom_arena', 'system', 'staff', 'support', 'official', 'null', 'undefined', 'guest', 'player', 'bot', 'server', 'teacher', 'draconis', 'lydia', 'clockwork']);
const BLOCKED = ['fuck', 'shit', 'bitch', 'cunt', 'nigg', 'fag', 'dick', 'cock', 'pussy', 'asshole', 'whore', 'slut', 'nazi', 'hitler', 'rape', 'porn', 'sex', 'cum', 'penis', 'vagina', 'retard', 'kys'];

/** Case-insensitive identity: "Jordi" and "jordi" are the same name. */
export const nameKey = (name: string) => name.trim().toLowerCase();

export type NameCheck = { ok: true; name: string } | { ok: false; reason: string };

export function validateName(raw: string): NameCheck {
  const name = (raw ?? '').trim();
  if (name.length < NAME_MIN || name.length > NAME_MAX) return { ok: false, reason: `Use ${NAME_MIN} to ${NAME_MAX} characters.` };
  if (!NAME_PATTERN.test(name)) return { ok: false, reason: 'Letters, numbers and underscores only, starting with a letter. No spaces.' };
  const key = nameKey(name).replace(/_/g, '');
  if (RESERVED.has(nameKey(name)) || RESERVED.has(key)) return { ok: false, reason: 'That name is reserved.' };
  if (BLOCKED.some((w) => key.includes(w))) return { ok: false, reason: 'Pick something classroom-friendly.' };
  return { ok: true, name };
}
