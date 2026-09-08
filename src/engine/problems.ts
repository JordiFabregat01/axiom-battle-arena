import { Rng, randInt, pick } from './rng';

export interface Problem {
  /** Rendered expression, e.g. "47 × 83" or "3x + 7 = 22". */
  text: string;
  /** Short instruction shown above the expression. */
  hint: string;
  answer: number;
  tier: number;
}

export interface TierDef {
  id: number;
  name: string;
  ages: string;
  blurb: string;
  topics: string[];
}

/** Skill levels. Casual play lets you choose one directly; ranked play
 *  scales through them automatically as you climb. */
export const TIERS: TierDef[] = [
  { id: 1, name: 'Sprout', ages: 'Ages 6–8', blurb: 'Adding and subtracting up to 20.', topics: ['+ and − to 20', 'missing numbers', 'three-number sums'] },
  { id: 2, name: 'Scholar', ages: 'Ages 8–10', blurb: 'Sums to 100 and the times tables.', topics: ['+ and − to 100', 'times tables', 'simple division', 'doubling'] },
  { id: 3, name: 'Apprentice', ages: 'Ages 10–12', blurb: 'Long multiplication, division and order of operations.', topics: ['2-digit multiplication', 'division', 'order of operations', 'squares', 'fractions of numbers'] },
  { id: 4, name: 'Adept', ages: 'Ages 12–14', blurb: 'Negatives, percentages, roots and first equations.', topics: ['negative numbers', 'percentages', 'square roots', 'cubes', 'linear equations', 'averages'] },
  { id: 5, name: 'Expert', ages: 'Ages 14–18', blurb: 'Algebra, exponents, GCD & LCM, modular arithmetic.', topics: ['distribution', 'exponents', 'gcd / lcm', 'mod', 'x on both sides', 'arithmetic sums'] },
  { id: 6, name: 'Master', ages: 'University & teachers', blurb: 'Series, combinatorics, derivatives and primes.', topics: ['derivatives', 'binomials', 'prime counting', 'factorials', 'geometric sums', 'logarithms', 'modular powers', 'determinants'] },
  { id: 7, name: 'Grandmaster', ages: 'Hardcore', blurb: 'Number theory, big mental arithmetic, quadratics and matrices.', topics: ['last digits of powers', 'divisor counting', 'Vieta', '2-digit × 2-digit', 'Euler φ', 'Fibonacci', 'integrals', 'trailing zeros'] },
];

export function tierById(id: number): TierDef {
  return TIERS.find((t) => t.id === id) ?? TIERS[0];
}

const SUP = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
const SUB = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
export const sup = (n: number) => String(n).split('').map((c) => (c === '-' ? '⁻' : SUP[+c])).join('');
export const sub = (n: number) => String(n).split('').map((c) => SUB[+c]).join('');

/** Render a number as an operand: negatives get parentheses and a true minus sign. */
const op = (n: number) => (n < 0 ? `(−${-n})` : String(n));
const signed = (n: number) => (n < 0 ? `− ${-n}` : `+ ${n}`);

function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}
function lcm(a: number, b: number) { return (a * b) / gcd(a, b); }
function modPow(b: number, e: number, m: number) {
  let r = 1; b %= m;
  while (e > 0) { if (e & 1) r = (r * b) % m; b = (b * b) % m; e >>= 1; }
  return r;
}
function nCr(n: number, r: number) {
  let out = 1;
  for (let i = 1; i <= r; i++) out = (out * (n - r + i)) / i;
  return Math.round(out);
}
function totient(n: number) {
  let result = n, p = 2, m = n;
  while (p * p <= m) {
    if (m % p === 0) { while (m % p === 0) m /= p; result -= result / p; }
    p++;
  }
  if (m > 1) result -= result / m;
  return Math.round(result);
}
function fib(n: number) { let a = 1, b = 1; for (let i = 2; i < n; i++) [a, b] = [b, a + b]; return n <= 2 ? 1 : b; }
function isPrime(n: number) { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; }
function primesBelow(n: number) { let c = 0; for (let i = 2; i < n; i++) if (isPrime(i)) c++; return c; }
function lastDigitPow(b: number, e: number) { let r = 1; for (let i = 0; i < e; i++) r = (r * b) % 10; return r; }
function divisorCount(n: number) { let c = 0; for (let d = 1; d * d <= n; d++) if (n % d === 0) c += d * d === n ? 1 : 2; return c; }

type Gen = (rng: Rng) => { text: string; answer: number; hint?: string };

const T1: Gen[] = [
  (r) => { const a = randInt(r, 1, 10), b = randInt(r, 1, 10); return { text: `${a} + ${b}`, answer: a + b }; },
  (r) => { const a = randInt(r, 3, 20), b = randInt(r, 1, a - 1); return { text: `${a} − ${b}`, answer: a - b }; },
  (r) => { const a = randInt(r, 1, 10), s = randInt(r, a + 1, 20); return { text: `${a} + ? = ${s}`, answer: s - a, hint: 'Find the missing number' }; },
  (r) => { const a = randInt(r, 1, 6), b = randInt(r, 1, 6), c = randInt(r, 1, 6); return { text: `${a} + ${b} + ${c}`, answer: a + b + c }; },
  (r) => { const a = randInt(r, 1, 10), b = randInt(r, 1, 10); return { text: `${a} + ${b}`, answer: a + b }; },
];

const T2: Gen[] = [
  (r) => { const a = randInt(r, 10, 80), b = randInt(r, 10, 100 - a); return { text: `${a} + ${b}`, answer: a + b }; },
  (r) => { const a = randInt(r, 30, 99), b = randInt(r, 5, a - 1); return { text: `${a} − ${b}`, answer: a - b }; },
  (r) => { const a = randInt(r, 2, 10), b = randInt(r, 2, 10); return { text: `${a} × ${b}`, answer: a * b }; },
  (r) => { const a = randInt(r, 2, 10), b = randInt(r, 2, 10); return { text: `${a} × ${b}`, answer: a * b }; },
  (r) => { const b = randInt(r, 2, 10), q = randInt(r, 2, 10); return { text: `${b * q} ÷ ${b}`, answer: q }; },
  (r) => { const a = randInt(r, 11, 49); return { text: `${a} × 2`, answer: a * 2 }; },
  (r) => { const a = randInt(r, 2, 9), q = randInt(r, 2, 9); return { text: `${a} × ? = ${a * q}`, answer: q, hint: 'Find the missing number' }; },
];

const T3: Gen[] = [
  (r) => { const a = randInt(r, 12, 99), b = randInt(r, 3, 9); return { text: `${a} × ${b}`, answer: a * b }; },
  (r) => { const a = randInt(r, 11, 25), b = randInt(r, 11, 19); return { text: `${a} × ${b}`, answer: a * b }; },
  (r) => { const b = randInt(r, 3, 9), q = randInt(r, 11, 99); return { text: `${b * q} ÷ ${b}`, answer: q }; },
  (r) => { const a = randInt(r, 2, 9), b = randInt(r, 2, 9), c = randInt(r, 2, 9); return { text: `${a} + ${b} × ${c}`, answer: a + b * c, hint: 'Order of operations' }; },
  (r) => { const a = randInt(r, 3, 9), b = randInt(r, 3, 9), c = randInt(r, 1, 9); return { text: `${a} × ${b} − ${c}`, answer: a * b - c, hint: 'Order of operations' }; },
  (r) => { const a = randInt(r, 2, 9), b = randInt(r, 2, 9), c = randInt(r, 2, 9); return { text: `(${a} + ${b}) × ${c}`, answer: (a + b) * c }; },
  (r) => { const n = randInt(r, 4, 15); return { text: `${n}${sup(2)}`, answer: n * n }; },
  (r) => { const d = pick(r, [2, 3, 4, 5, 6, 8, 10]), q = randInt(r, 2, 12); return { text: `1/${d} of ${d * q}`, answer: q }; },
];

const T4: Gen[] = [
  (r) => { const a = randInt(r, -20, 20), b = randInt(r, -20, 20); return { text: `${op(a)} + ${op(b)}`, answer: a + b }; },
  (r) => { const a = randInt(r, -20, 20), b = randInt(r, -20, 20); return { text: `${op(a)} − ${op(b)}`, answer: a - b }; },
  (r) => { let a = randInt(r, -12, 12), b = randInt(r, -12, 12); if (a === 0) a = -7; if (b === 0) b = 6; return { text: `${op(a)} × ${op(b)}`, answer: a * b }; },
  (r) => { const p = pick(r, [5, 10, 20, 25, 50, 75]); const step = 100 / gcd(p, 100); const n = step * randInt(r, 1, 16); return { text: `${p}% of ${n}`, answer: (p * n) / 100 }; },
  (r) => { const n = randInt(r, 5, 20); return { text: `√${n * n}`, answer: n }; },
  (r) => { const n = randInt(r, 2, 7); return { text: `${n}${sup(3)}`, answer: n ** 3 }; },
  (r) => { const x = randInt(r, -10, 10), a = randInt(r, 1, 15); return { text: `x + ${a} = ${x + a}`, answer: x, hint: 'Solve for x' }; },
  (r) => { const a = randInt(r, 2, 9), x = randInt(r, 1, 12), b = randInt(r, 1, 20); return { text: `${a}x + ${b} = ${a * x + b}`, answer: x, hint: 'Solve for x' }; },
  (r) => { const m = randInt(r, 4, 30), d1 = randInt(r, 1, 3), d2 = randInt(r, 1, 3); const a = m - d1, b = m + d1 + d2, c = m - d2; return { text: `mean of ${a}, ${b}, ${c}`, answer: m, hint: 'Average' }; },
];

const T5: Gen[] = [
  (r) => { const a = randInt(r, 2, 9), b = randInt(r, 1, 9), x = randInt(r, 2, 12); return { text: `${a}(x − ${b}) = ${a * (x - b)}`, answer: x, hint: 'Solve for x' }; },
  (r) => { const base = pick(r, [2, 2, 3, 4, 5]); const maxE = base === 2 ? 10 : base === 3 ? 6 : base === 4 ? 5 : 4; const e = randInt(r, 2, maxE); return { text: `${base}${sup(e)}`, answer: base ** e }; },
  (r) => { const g = randInt(r, 2, 12); const a = g * randInt(r, 2, 9); let b = g * randInt(r, 2, 9); if (a === b) b += g; return { text: `gcd(${a}, ${b})`, answer: gcd(a, b) }; },
  (r) => { const a = randInt(r, 2, 12); let b = randInt(r, 2, 12); if (a === b) b = a + 1; return { text: `lcm(${a}, ${b})`, answer: lcm(a, b) }; },
  (r) => { const a = randInt(r, 10, 99), m = randInt(r, 3, 9); return { text: `${a} mod ${m}`, answer: a % m }; },
  (r) => { const a = randInt(r, 3, 9), c = randInt(r, 1, a - 1), x = randInt(r, 1, 12), b = randInt(r, 1, 15); const d = (a - c) * x + b; return { text: `${a}x + ${b} = ${c}x + ${d}`, answer: x, hint: 'Solve for x' }; },
  (r) => { const n = randInt(r, 5, 30); return { text: `1 + 2 + … + ${n}`, answer: (n * (n + 1)) / 2 }; },
  (r) => { const x = randInt(r, 3, 20); return { text: `x${sup(2)} = ${x * x},  x > 0`, answer: x, hint: 'Solve for x' }; },
  (r) => { const a = randInt(r, 2, 6), b = randInt(r, 2, 6), x = randInt(r, 2, 9); return { text: `${a}x − ${b} = ${a * x - b}`, answer: x, hint: 'Solve for x' }; },
];

const T6: Gen[] = [
  (r) => { const a = randInt(r, 1, 5), b = randInt(r, 1, 9), x0 = randInt(r, 1, 5); return { text: `f(x) = ${a}x${sup(2)} + ${b}x,   f′(${x0})`, answer: 2 * a * x0 + b, hint: 'Derivative at a point' }; },
  (r) => { const n = randInt(r, 5, 10), k = randInt(r, 2, n - 2); return { text: `C(${n}, ${k})`, answer: nCr(n, k), hint: 'Binomial coefficient' }; },
  (r) => { const n = pick(r, [20, 30, 40, 50, 60, 100]); return { text: `π(${n})`, answer: primesBelow(n), hint: 'How many primes below n?' }; },
  (r) => { const n = randInt(r, 5, 10), k = randInt(r, 1, 3); let v = 1; for (let i = 0; i < k; i++) v *= n - i; return { text: `${n}! / ${n - k}!`, answer: v }; },
  (r) => { const n = randInt(r, 3, 10); return { text: `1 + 2 + 4 + … + 2${sup(n)}`, answer: 2 ** (n + 1) - 1 }; },
  (r) => { const n = randInt(r, 5, 20); return { text: `1 + 3 + 5 + … + ${2 * n - 1}`, answer: n * n }; },
  (r) => { const b = pick(r, [2, 3, 10]); const k = b === 2 ? randInt(r, 3, 10) : b === 3 ? randInt(r, 2, 5) : randInt(r, 2, 6); return { text: `log${sub(b)} ${b ** k}`, answer: k }; },
  (r) => { const b = randInt(r, 2, 7), e = randInt(r, 3, 8), m = randInt(r, 5, 13); return { text: `${b}${sup(e)} mod ${m}`, answer: modPow(b, e, m) }; },
  (r) => { const a = randInt(r, -6, 9), b = randInt(r, -6, 9), c = randInt(r, -6, 9), d = randInt(r, -6, 9); return { text: `det [ ${a}  ${b} ; ${c}  ${d} ]`, answer: a * d - b * c, hint: '2×2 determinant (rows split by ;)' }; },
  (r) => { const a = randInt(r, 1, 9), d = randInt(r, 2, 9), n = randInt(r, 8, 15); return { text: `${a}, ${a + d}, ${a + 2 * d}, …  term ${n}`, answer: a + (n - 1) * d, hint: 'Arithmetic sequence' }; },
];

const T7: Gen[] = [
  (r) => { const b = randInt(r, 2, 9), e = randInt(r, 10, 200); return { text: `${b}${sup(e)}`, answer: lastDigitPow(b, e), hint: 'Last digit of' }; },
  (r) => { let n = 1; do { n = 2 ** randInt(r, 0, 4) * 3 ** randInt(r, 0, 3) * 5 ** randInt(r, 0, 2); } while (n < 12); return { text: `d(${n})`, answer: divisorCount(n), hint: 'Number of positive divisors' }; },
  (r) => {
    let r1 = randInt(r, -9, 9), r2 = randInt(r, -9, 9); if (r1 === 0) r1 = 4; if (r2 === 0) r2 = -3;
    const s = r1 + r2, p = r1 * r2; const askSum = r() < 0.5;
    const bTerm = s === 0 ? '' : ` ${signed(-s)}x`;
    return { text: `x${sup(2)}${bTerm} ${signed(p)} = 0`, answer: askSum ? s : p, hint: askSum ? 'Sum of the roots' : 'Product of the roots' };
  },
  (r) => { const a = randInt(r, 21, 99), b = randInt(r, 21, 99); return { text: `${a} × ${b}`, answer: a * b }; },
  (r) => { const n = randInt(r, 21, 60); return { text: `${n}${sup(2)}`, answer: n * n }; },
  (r) => { const a = randInt(r, 100, 999), b = randInt(r, 100, 999), c = randInt(r, 100, 999); return { text: `${a} + ${b} + ${c}`, answer: a + b + c }; },
  (r) => { const g = randInt(r, 7, 25), a = g * randInt(r, 11, 40); let b = g * randInt(r, 11, 40); if (b === a) b += g; return { text: `gcd(${a}, ${b})`, answer: gcd(a, b) }; },
  (r) => { const n = randInt(r, 10, 60); return { text: `φ(${n})`, answer: totient(n), hint: "Euler's totient" }; },
  (r) => { const n = randInt(r, 10, 20); return { text: `F${sub(n)}`, answer: fib(n), hint: 'Fibonacci (F₁ = F₂ = 1)' }; },
  (r) => { const a = randInt(r, 1, 4), u = randInt(r, 1, 5); return { text: `∫${sub(0)}${sup(u)} ${2 * a}x dx`, answer: a * u * u, hint: 'Definite integral' }; },
  (r) => { const n = randInt(r, 10, 60); return { text: `${n}!`, answer: Math.floor(n / 5) + Math.floor(n / 25), hint: 'Number of trailing zeros' }; },
  (r) => { const n = randInt(r, 10, 14), k = randInt(r, 2, 5); return { text: `C(${n}, ${k})`, answer: nCr(n, k), hint: 'Binomial coefficient' }; },
  (r) => { const b = randInt(r, 2, 9), e = randInt(r, 10, 50), m = pick(r, [7, 11, 13, 17, 19, 23, 29, 31]); return { text: `${b}${sup(e)} mod ${m}`, answer: modPow(b, e, m) }; },
];

const GENS: Record<number, Gen[]> = { 1: T1, 2: T2, 3: T3, 4: T4, 5: T5, 6: T6, 7: T7 };

export function generateProblem(tier: number, rng: Rng): Problem {
  const gens = GENS[Math.min(7, Math.max(1, tier))];
  const g = pick(rng, gens)(rng);
  return { text: g.text, hint: g.hint ?? 'Compute', answer: g.answer, tier };
}

/** Points for a correct answer: 100 base plus up to 50 for speed. */
export function pointsFor(seconds: number): number {
  return 100 + Math.max(0, Math.round(50 * (1 - seconds / 10)));
}
export const WRONG_PENALTY = 25;
export const SKIP_PENALTY = 15;
export const DUEL_SECONDS = 60;
