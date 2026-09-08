import { Link } from '../router';

/* Drafts. Replace the bracketed placeholders and have them reviewed before launch:
   the game is used by children through their teachers, which brings COPPA (US, under 13)
   and GDPR-K (EU, under 13–16 depending on the country) into play. */

const OPERATOR = '[Your name or company]';
const CONTACT = '[contact email]';
const UPDATED = '8 September 2026';

export function Privacy() {
  return (
    <div className="page legal">
      <p className="eyebrow cool">Privacy</p>
      <h1>Privacy policy</h1>
      <p className="dim">Last updated {UPDATED} · Operator: {OPERATOR} · Contact: {CONTACT}</p>

      <h2>What we store</h2>
      <ul>
        <li><b>Guest play</b> stores nothing about you on our servers beyond a random guest id and your game profile (a display name you choose, ratings, cards, coins and match history). Nothing links it to a real person.</li>
        <li><b>Accounts</b> add your email address (or the email and name your Google account shares when you sign in with Google) so you can return to the same profile from any device.</li>
        <li><b>Purchases</b>, if enabled, are processed by Stripe. We never see or store card numbers; we keep the Stripe payment id and what was bought.</li>
      </ul>

      <h2>What we do not do</h2>
      <ul>
        <li>No advertising, no selling or sharing of data with third parties for their own purposes.</li>
        <li>No tracking across other websites.</li>
        <li>No public display of your email; other players only see the display name you chose, your rating, level and the cards in your spotlight deck.</li>
      </ul>

      <h2>Children</h2>
      <p>
        Axiom Arena is designed to be used by students at the suggestion of their teachers. Children can play as guests without creating an account or giving us any personal information.
        Accounts require an email address; children under 13 (or the age of digital consent where they live) should only create one with a parent's or school's permission.
        If you believe a child has created an account without permission, write to {CONTACT} and we will delete it.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li>You can rename or reset your profile from the Profile page at any time.</li>
        <li>You can ask for a copy of your data or for its deletion by writing to {CONTACT}. Account deletion removes your profile and email within 30 days.</li>
      </ul>

      <h2>Where data lives</h2>
      <p>Profiles and accounts are stored with Supabase (hosting region: [region]); the game server runs on [hosting provider]. Both are protected by encryption in transit and at rest.</p>

      <p className="dim" style={{ marginTop: '2rem' }}><Link to="/terms" className="cool">Terms of use</Link> · <Link to="/" className="cool">Back to the arena</Link></p>
    </div>
  );
}

export function Terms() {
  return (
    <div className="page legal">
      <p className="eyebrow cool">Terms</p>
      <h1>Terms of use</h1>
      <p className="dim">Last updated {UPDATED} · Operator: {OPERATOR} · Contact: {CONTACT}</p>

      <h2>The game</h2>
      <ul>
        <li>Axiom Arena is a competitive math game. Ratings, ranks, cards and coins are game items with no cash value and cannot be transferred, traded or refunded.</li>
        <li>Pack odds are printed on every card and are the same for every player; nothing purchasable changes them.</li>
        <li>We may change questions, rewards, cards and seasons over time. Seasons end on the announced date and rewards are granted for the tier reached.</li>
      </ul>

      <h2>Fair play</h2>
      <ul>
        <li>One account per person. Do not share accounts.</li>
        <li>Using scripts, solvers or any automation to answer questions, or interfering with the service, may result in reset ratings or a closed account.</li>
        <li>Display names must be appropriate for a classroom. We may rename or remove accounts that are not.</li>
      </ul>

      <h2>Purchases and membership</h2>
      <ul>
        <li>Coin bundles are one-time purchases delivered to your account immediately after payment.</li>
        <li>Axiom Plus is a monthly membership billed through Stripe. Cancel any time; benefits last until the end of the paid period.</li>
        <li>Refunds follow the law of your country; write to {CONTACT}.</li>
      </ul>

      <h2>Availability</h2>
      <p>We aim to keep the arena online but provide it as is, without warranty, and may suspend it for maintenance. Our liability is limited to the amount you paid us in the last 12 months.</p>

      <p className="dim" style={{ marginTop: '2rem' }}><Link to="/privacy" className="cool">Privacy policy</Link> · <Link to="/" className="cool">Back to the arena</Link></p>
    </div>
  );
}
