/** Story mode problems: exam-style word problems that take a little thinking.
 *  Each band matches a duel level (1 = Sprout … 7 = Grandmaster) but asks for
 *  reasoning rather than speed. Every generator returns an integer answer and
 *  a short worked explanation shown after answering. */
import { Rng, randInt, pick } from './rng';

export interface WordProblem {
  text: string;
  answer: number;
  explanation: string;
  band: number;
}

type Gen = (r: Rng) => Omit<WordProblem, 'band'>;

function gcd(a: number, b: number): number { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; }
function nCr(n: number, k: number) { let out = 1; for (let i = 1; i <= k; i++) out = (out * (n - k + i)) / i; return Math.round(out); }
function totient(n: number) { let result = n, p = 2, m = n; while (p * p <= m) { if (m % p === 0) { while (m % p === 0) m /= p; result -= result / p; } p++; } if (m > 1) result -= result / m; return Math.round(result); }
function divisorCount(n: number) { let c = 0; for (let d = 1; d * d <= n; d++) if (n % d === 0) c += d * d === n ? 1 : 2; return c; }
function lastDigitPow(b: number, e: number) { let r = 1; for (let i = 0; i < e; i++) r = (r * b) % 10; return r; }
function fib(n: number) { let a = 1, b = 1; for (let i = 2; i < n; i++) [a, b] = [b, a + b]; return n <= 2 ? 1 : b; }

const THINGS = ['golden scales', 'lanterns', 'star charts', 'copper gears', 'silver coins', 'jars of honey', 'marble tiles', 'seed packets'];
const PEOPLE = ['guards', 'apprentices', 'gardeners', 'scouts', 'scribes', 'pilots'];

const B1: Gen[] = [
  (r) => { const a = randInt(r, 3, 12), b = randInt(r, 2, 8), t = pick(r, THINGS); return { text: `You count ${a} ${t} in the morning and find ${b} more by noon. How many ${t} do you have now?`, answer: a + b, explanation: `${a} + ${b} = ${a + b}.` }; },
  (r) => { const t = randInt(r, 8, 20), b = randInt(r, 2, t - 1); return { text: `A shelf holds ${t} lanterns. ${b} of them are lit. How many are still dark?`, answer: t - b, explanation: `${t} − ${b} = ${t - b}.` }; },
  (r) => { const a = randInt(r, 2, 7), b = randInt(r, 2, 7), c = randInt(r, 1, 6); return { text: `Three friends bring ${a}, ${b} and ${c} apples to share. How many apples are there altogether?`, answer: a + b + c, explanation: `${a} + ${b} + ${c} = ${a + b + c}.` }; },
  (r) => { const need = randInt(r, 10, 20), have = randInt(r, 2, need - 2); return { text: `A path needs ${need} tiles. You have ${have}. How many more tiles do you need?`, answer: need - have, explanation: `${need} − ${have} = ${need - have}.` }; },
  (r) => { const a = randInt(r, 4, 10), b = randInt(r, 1, 5); return { text: `A dragon had ${a} sheep for dinner and ${b} for breakfast. How many sheep did it eat?`, answer: a + b, explanation: `${a} + ${b} = ${a + b}.` }; },
];

const B2: Gen[] = [
  (r) => { const k = randInt(r, 3, 9), n = randInt(r, 3, 9), t = pick(r, THINGS); return { text: `Each crate holds ${k} ${t}. How many ${t} are in ${n} crates?`, answer: k * n, explanation: `${n} crates × ${k} = ${k * n}.` }; },
  (r) => { const n = randInt(r, 3, 9), q = randInt(r, 3, 12), p = pick(r, PEOPLE); return { text: `${n * q} silver coins are shared equally among ${n} ${p}. How many coins does each get?`, answer: q, explanation: `${n * q} ÷ ${n} = ${q}.` }; },
  (r) => { const w = randInt(r, 2, 6), d = randInt(r, 1, 6); return { text: `The journey takes ${w} weeks and ${d} extra days. How many days is that?`, answer: 7 * w + d, explanation: `${w} weeks = ${7 * w} days, plus ${d} = ${7 * w + d}.` }; },
  (r) => { const p = randInt(r, 5, 12), n = randInt(r, 4, 9); return { text: `A scribe copies ${p} pages every day. The book has ${p * n} pages. How many days will it take?`, answer: n, explanation: `${p * n} ÷ ${p} = ${n} days.` }; },
  (r) => { const a = randInt(r, 25, 60), b = randInt(r, 10, 35); return { text: `A lantern maker had ${a + b} lanterns and sold ${b}. How many are left?`, answer: a, explanation: `${a + b} − ${b} = ${a}.` }; },
  (r) => { const a = randInt(r, 12, 45), b = randInt(r, 12, 45); return { text: `Two scouts find ${a} and ${b} star charts. How many charts in total?`, answer: a + b, explanation: `${a} + ${b} = ${a + b}.` }; },
];

const B3: Gen[] = [
  (r) => { const k = randInt(r, 6, 12), n = randInt(r, 4, 9), m = randInt(r, 1, 9), t = pick(r, THINGS); return { text: `There are ${n} crates with ${k} ${t} each, plus ${m} loose ones. How many ${t} in total?`, answer: k * n + m, explanation: `${n} × ${k} = ${k * n}, plus ${m} = ${k * n + m}.` }; },
  (r) => { const l = randInt(r, 3, 9), n = randInt(r, 7, 15); return { text: `A rope ${l * n} m long is cut into pieces of ${l} m. How many pieces are there?`, answer: n, explanation: `${l * n} ÷ ${l} = ${n} pieces.` }; },
  (r) => { const c = randInt(r, 8, 25), n = randInt(r, 3, 6), v = randInt(r, 5, 20); return { text: `Tickets cost ${c} coins each. A family of ${n} has a voucher worth ${v} coins. How much do they pay?`, answer: n * c - v, explanation: `${n} × ${c} = ${n * c}, minus ${v} = ${n * c - v}.` }; },
  (r) => { const a = randInt(r, 6, 15), b = randInt(r, 6, 15); return { text: `A hall floor is ${a} tiles long and ${b} tiles wide. How many tiles cover the floor?`, answer: a * b, explanation: `${a} × ${b} = ${a * b}.` }; },
  (r) => { const n = randInt(r, 4, 9), k = randInt(r, 8, 15), g = randInt(r, 5, 20); return { text: `${n} bags hold ${k} marbles each. ${g} marbles are given away. How many remain?`, answer: n * k - g, explanation: `${n} × ${k} = ${n * k}, minus ${g} = ${n * k - g}.` }; },
  (r) => { const d = pick(r, [2, 3, 4, 5, 6]), q = randInt(r, 4, 12); const N = d * q; return { text: `1/${d} of the ${N} lanterns are broken. How many still work?`, answer: N - q, explanation: `1/${d} of ${N} is ${q}; ${N} − ${q} = ${N - q}.` }; },
  (r) => { const a = randInt(r, 2, 9), b = randInt(r, 2, 9), c = randInt(r, 2, 9); return { text: `A guard earns ${a} coins a day for ${b} days, then spends ${c} coins. How many coins are left?`, answer: a * b - c, explanation: `${a} × ${b} = ${a * b}, minus ${c} = ${a * b - c}.` }; },
];

const B4: Gen[] = [
  (r) => { const p = pick(r, [10, 20, 25, 50, 75]); const step = 100 / gcd(p, 100); const N = step * randInt(r, 2, 12); return { text: `${p}% of the ${N} guards are archers. How many archers are there?`, answer: (p * N) / 100, explanation: `${p}% of ${N} = ${N} × ${p}/100 = ${(p * N) / 100}.` }; },
  (r) => { const a = randInt(r, -5, 8), b = randInt(r, 4, 15); return { text: `The temperature was ${a}° at dusk and fell ${b}° overnight. What was the temperature at dawn?`, answer: a - b, explanation: `${a} − ${b} = ${a - b}.` }; },
  (r) => { const m = randInt(r, 10, 30), a = m + randInt(r, -8, 8), b = m + randInt(r, -8, 8); const c = 3 * m - a - b; return { text: `Two scores are ${a} and ${b}. The mean of three scores is ${m}. What is the third score?`, answer: c, explanation: `Total must be 3 × ${m} = ${3 * m}; ${3 * m} − ${a} − ${b} = ${c}.` }; },
  (r) => { const n = randInt(r, 4, 15); return { text: `A square garden has an area of ${n * n} m². What is its perimeter in metres?`, answer: 4 * n, explanation: `Side = √${n * n} = ${n}; perimeter = 4 × ${n} = ${4 * n}.` }; },
  (r) => { const a = randInt(r, 2, 9), x = randInt(r, 2, 12), b = randInt(r, 1, 20); return { text: `${a} times a number, plus ${b}, equals ${a * x + b}. What is the number?`, answer: x, explanation: `${a}x + ${b} = ${a * x + b} → ${a}x = ${a * x} → x = ${x}.` }; },
  (r) => { const v = randInt(r, 30, 90), t = randInt(r, 2, 6); return { text: `A cart travels at ${v} km/h for ${t} hours. How far does it go, in km?`, answer: v * t, explanation: `Distance = speed × time = ${v} × ${t} = ${v * t}.` }; },
  (r) => { const n = randInt(r, 3, 12); return { text: `A cube has edges of ${n} cm. What is its volume in cm³?`, answer: n ** 3, explanation: `${n}³ = ${n ** 3}.` }; },
];

const B5: Gen[] = [
  (r) => { const d = 2 * randInt(r, 1, 10), s = d + 2 * randInt(r, 5, 25); return { text: `Two numbers add up to ${s} and differ by ${d}. What is the larger number?`, answer: (s + d) / 2, explanation: `Larger = (sum + difference) / 2 = (${s} + ${d}) / 2 = ${(s + d) / 2}.` }; },
  (r) => { const k = randInt(r, 2, 4), w = randInt(r, 2, 9); const P = 2 * (k + 1) * w; return { text: `A rectangle's length is ${k} times its width and its perimeter is ${P}. What is its area?`, answer: k * w * w, explanation: `Perimeter = 2(w + ${k}w) = ${2 * (k + 1)}w = ${P} → w = ${w}; area = ${k * w} × ${w} = ${k * w * w}.` }; },
  (r) => {
    const m1 = pick(r, [3, 4, 5]), m2 = pick(r, [7, 11, 13]); const r1 = randInt(r, 1, m1 - 1), r2 = randInt(r, 1, m2 - 1);
    let n = 1; while (n % m1 !== r1 || n % m2 !== r2) n++;
    return { text: `A number leaves remainder ${r1} when divided by ${m1} and remainder ${r2} when divided by ${m2}. What is the smallest such positive number?`, answer: n, explanation: `Check multiples: ${n} = ${Math.floor(n / m1)}×${m1} + ${r1} and ${n} = ${Math.floor(n / m2)}×${m2} + ${r2}.` };
  },
  (r) => { const n = randInt(r, 5, 30); return { text: `What is the sum of the first ${n} even numbers (2 + 4 + … + ${2 * n})?`, answer: n * (n + 1), explanation: `2 + 4 + … + 2n = n(n + 1) = ${n} × ${n + 1} = ${n * (n + 1)}.` }; },
  (r) => { const mid = randInt(r, 5, 40); return { text: `The sum of three consecutive integers is ${3 * mid}. What is the largest of them?`, answer: mid + 1, explanation: `The middle one is ${3 * mid} ÷ 3 = ${mid}, so the largest is ${mid + 1}.` }; },
  (r) => { const t1 = randInt(r, 1, 3), t2 = randInt(r, 1, 3), v1 = randInt(r, 4, 12) * 10, v2 = randInt(r, 4, 12) * 10; const d = v1 * t1 + v2 * t2; const avg = d / (t1 + t2); if (!Number.isInteger(avg)) return { text: `A rider covers ${v1} km in ${t1} hour${t1 > 1 ? 's' : ''}, then ${v2 * t2} km more. How far did they ride in total, in km?`, answer: d, explanation: `${v1 * t1} + ${v2 * t2} = ${d}.` }; return { text: `A rider goes ${v1} km/h for ${t1} h, then ${v2} km/h for ${t2} h. What is the average speed for the whole ride, in km/h?`, answer: avg, explanation: `Total distance ${d} km over ${t1 + t2} h = ${avg} km/h.` }; },
  (r) => { const a = randInt(r, 2, 9), b = randInt(r, 2, 9), x = randInt(r, 3, 14); return { text: `A number is multiplied by ${a}; then ${b} is subtracted; the result is ${a * x - b}. What was the number?`, answer: x, explanation: `${a}x − ${b} = ${a * x - b} → ${a}x = ${a * x} → x = ${x}.` }; },
];

const B6: Gen[] = [
  (r) => { const n = randInt(r, 6, 12), k = randInt(r, 2, 4); return { text: `How many ways can ${k} knights be chosen from a company of ${n}?`, answer: nCr(n, k), explanation: `C(${n}, ${k}) = ${nCr(n, k)}.` }; },
  (r) => { const n = randInt(r, 6, 20); return { text: `${n} scribes each shake hands once with every other scribe. How many handshakes happen?`, answer: (n * (n - 1)) / 2, explanation: `n(n − 1)/2 = ${n} × ${n - 1} / 2 = ${(n * (n - 1)) / 2}.` }; },
  (r) => { const n = randInt(r, 5, 15); return { text: `How many diagonals does a convex polygon with ${n} sides have?`, answer: (n * (n - 3)) / 2, explanation: `n(n − 3)/2 = ${n} × ${n - 3} / 2 = ${(n * (n - 3)) / 2}.` }; },
  (r) => { const a = pick(r, [2, 3, 4]), b = pick(r, [5, 7, 9]); const N = pick(r, [60, 100, 120, 200]); const l = (a * b) / gcd(a, b); const ans = Math.floor(N / a) + Math.floor(N / b) - Math.floor(N / l); return { text: `How many integers from 1 to ${N} are divisible by ${a} or by ${b}?`, answer: ans, explanation: `${Math.floor(N / a)} multiples of ${a}, ${Math.floor(N / b)} of ${b}, minus ${Math.floor(N / l)} of both (${l}): ${ans}.` }; },
  (r) => { const n = randInt(r, 10, 60); const z = Math.floor(n / 5) + Math.floor(n / 25); return { text: `How many zeros does ${n}! end with?`, answer: z, explanation: `Count factors of 5: ⌊${n}/5⌋ + ⌊${n}/25⌋ = ${Math.floor(n / 5)} + ${Math.floor(n / 25)} = ${z}.` }; },
  (r) => { const n = randInt(r, 6, 25); return { text: `What is the sum of the first ${n} odd numbers?`, answer: n * n, explanation: `1 + 3 + … + (2n − 1) = n² = ${n * n}.` }; },
  (r) => { const n = randInt(r, 5, 12); return { text: `A lantern doubles its light every day, starting at 1 unit on day 1. What is the total light produced over ${n} days?`, answer: 2 ** n - 1, explanation: `1 + 2 + 4 + … + 2^${n - 1} = 2^${n} − 1 = ${2 ** n - 1}.` }; },
  (r) => { const a = randInt(r, 1, 9), d = randInt(r, 2, 6), n = randInt(r, 8, 20); const s = (n * (2 * a + (n - 1) * d)) / 2; return { text: `Rows of seats have ${a}, ${a + d}, ${a + 2 * d}, … seats. How many seats are in the first ${n} rows?`, answer: s, explanation: `Sum = n(2a + (n − 1)d)/2 = ${n}(${2 * a} + ${(n - 1) * d})/2 = ${s}.` }; },
];

const B7: Gen[] = [
  (r) => { const b = randInt(r, 2, 9), e = randInt(r, 20, 300); return { text: `What is the last digit of ${b}^${e}?`, answer: lastDigitPow(b, e), explanation: `Last digits of powers of ${b} repeat in a cycle; ${b}^${e} ends in ${lastDigitPow(b, e)}.` }; },
  (r) => { let n = 1; do { n = 2 ** randInt(r, 1, 5) * 3 ** randInt(r, 0, 3) * 5 ** randInt(r, 0, 2) * 7 ** randInt(r, 0, 1); } while (n < 24 || n > 5000); return { text: `How many positive divisors does ${n} have?`, answer: divisorCount(n), explanation: `Factorise ${n}, add one to each exponent and multiply: ${divisorCount(n)}.` }; },
  (r) => { const m = pick(r, [100, 1000, 144, 360, 500]); let n = 1, f = 1; while (f % m !== 0) { n++; f *= n; } return { text: `What is the smallest positive integer n such that n! is divisible by ${m}?`, answer: n, explanation: `Check the prime factors of ${m}: the first factorial containing all of them is ${n}!.` }; },
  (r) => { const n = randInt(r, 3, 12); return { text: `What is the sum of the digits of 10^${n} − 1?`, answer: 9 * n, explanation: `10^${n} − 1 is ${n} nines, so the digit sum is 9 × ${n} = ${9 * n}.` }; },
  (r) => { const n = randInt(r, 10, 60); return { text: `How many integers from 1 to ${n} share no common factor greater than 1 with ${n}?`, answer: totient(n), explanation: `That is Euler's φ(${n}) = ${totient(n)}.` }; },
  (r) => { const k = randInt(r, 2, 12); return { text: `A right triangle has legs ${3 * k} and ${4 * k}. How long is the hypotenuse?`, answer: 5 * k, explanation: `A 3-4-5 triangle scaled by ${k}: hypotenuse ${5 * k}.` }; },
  (r) => { const m = randInt(r, 2, 6), n = randInt(r, 2, 6); return { text: `How many shortest paths go from (0,0) to (${m},${n}) moving only right or up?`, answer: nCr(m + n, m), explanation: `Choose which ${m} of the ${m + n} steps go right: C(${m + n}, ${m}) = ${nCr(m + n, m)}.` }; },
  (r) => { const n = randInt(r, 4, 12); return { text: `A set has ${n} elements. How many subsets does it have?`, answer: 2 ** n, explanation: `Each element is in or out: 2^${n} = ${2 ** n}.` }; },
  (r) => { const n = randInt(r, 10, 22); return { text: `Rabbits follow the Fibonacci rule (1, 1, 2, 3, 5, …). How many pairs are there in month ${n}?`, answer: fib(n), explanation: `F(${n}) = ${fib(n)}.` }; },
];

const BANDS: Record<number, Gen[]> = { 1: B1, 2: B2, 3: B3, 4: B4, 5: B5, 6: B6, 7: B7 };

export function generateWordProblem(band: number, rng: Rng): WordProblem {
  const b = Math.min(7, Math.max(1, band));
  let g = pick(rng, BANDS[b])(rng);
  let guard = 0;
  while ((!g.text || !Number.isFinite(g.answer) || !Number.isInteger(g.answer)) && guard++ < 10) g = pick(rng, BANDS[b])(rng);
  return { ...g, band: b };
}

/** A whole chapter's worth of problems, with no two identical prompts. */
export function generateChapterProblems(band: number, count: number, rng: Rng): WordProblem[] {
  const out: WordProblem[] = [];
  let guard = 0;
  while (out.length < count && guard++ < 60) {
    const p = generateWordProblem(band, rng);
    if (!out.some((q) => q.text === p.text)) out.push(p);
  }
  return out;
}
