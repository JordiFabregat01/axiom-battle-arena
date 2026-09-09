import { useState, type FormEvent } from 'react';
import { useAuth } from '../cloud/auth';
import { useStore } from '../state/store';
import { Link } from '../router';

export function Account() {
  const { configured, user, signInEmail, signUpEmail, signOut } = useAuth();
  const { profile } = useStore();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const err = mode === 'signin' ? await signInEmail(email, password) : await signUpEmail(email, password);
    setBusy(false);
    setMessage(err);
  };

  if (!configured) {
    return (
      <div className="page">
        <div className="page-head"><div><p className="eyebrow cool">Account</p><h1>Guest mode</h1></div></div>
        <div className="panel stack" style={{ maxWidth: 640 }}>
          <p>Your progress{profile ? ` as ${profile.name}` : ''} is saved only in this browser. Clearing site data, or switching devices, starts over.</p>
          <p className="dim">Accounts with cloud saves switch on as soon as this deployment is connected to its backend. The setup steps are in the project README under “Accounts and cloud saves”.</p>
          <Link to="/" className="btn btn-chalk" style={{ alignSelf: 'flex-start' }}>Back to the arena</Link>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="page">
        <div className="page-head"><div><p className="eyebrow cool">Account</p><h1>{user.name ?? user.email}</h1></div></div>
        <div className="panel stack" style={{ maxWidth: 640 }}>
          <p><b>{user.email}</b></p>
          <p className="dim">Your progress is saved to your account and follows you to any device. Changes sync a second or two after they happen.</p>
          <div className="row">
            <button type="button" className="btn" onClick={() => void signOut()}>Sign out</button>
            <Link to="/profile" className="btn btn-ghost">View profile</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head"><div><p className="eyebrow cool">Account</p><h1>{mode === 'signin' ? 'Sign in' : 'Create your account'}</h1></div></div>
      <form className="panel stack" onSubmit={submit} style={{ maxWidth: 560 }}>
        <p className="dim">{profile ? `Your guest progress as ${profile.name} can be attached to your new account.` : 'Keep your rating, cards and coins on every device.'}</p>
        <label className="eyebrow" htmlFor="email">Email</label>
        <input id="email" className="text-input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="eyebrow" htmlFor="password">Password</label>
        <input id="password" className="text-input" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        {message && <p className="notice" role="alert">{message}</p>}
        <div className="row">
          <button type="submit" className="btn btn-hot" disabled={busy}>{mode === 'signin' ? 'Sign in' : 'Create account'}</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(null); }}>
            {mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}
          </button>
        </div>
        <p className="faint" style={{ fontSize: '0.8rem' }}>Teachers: students can sign up with a school email, or simply play as guests without an account.</p>
      </form>
    </div>
  );
}
