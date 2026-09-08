import { useState, type FormEvent } from 'react';
import { useAuth } from '../cloud/auth';
import { useStore } from '../state/store';
import { Link } from '../router';

export function Account() {
  const { configured, user, signInEmail, signUpEmail, signInGoogle, signOut } = useAuth();
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

  const google = async () => {
    setBusy(true);
    const err = await signInGoogle();
    setBusy(false);
    if (err) setMessage(err);
  };

  if (!configured) {
    return (
      <div className="page">
        <div className="page-head"><div><p className="eyebrow cool">Account</p><h1>Guest mode</h1></div></div>
        <div className="panel stack" style={{ maxWidth: 640 }}>
          <p>Your progress{profile ? ` as ${profile.name}` : ''} is saved only in this browser. Clearing site data, or switching devices, starts over.</p>
          <p className="dim">Accounts (email + password and Google sign-in) with cloud saves switch on as soon as this deployment is connected to its backend. The setup steps are in the project README under “Accounts and cloud saves”.</p>
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
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <form className="panel stack" onSubmit={submit}>
          <p className="dim">{profile ? `Your guest progress as ${profile.name} will be attached to your new account.` : 'Keep your rating, cards and coins on every device.'}</p>
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
        </form>
        <div className="panel stack">
          <p className="eyebrow">Or continue with</p>
          <button type="button" className="btn btn-chalk" disabled={busy} onClick={google}>
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.5 13.3l7.8 6C12.2 13.6 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.5z"/><path fill="#FBBC05" d="M10.3 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.7l7.8-6z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.4 0-11.8-4.1-13.7-9.8l-7.8 6C6.5 42.6 14.6 48 24 48z"/></svg>
            Google
          </button>
          <p className="faint" style={{ fontSize: '0.8rem' }}>Teachers: students can sign up with a school email or Google account; nothing else is required.</p>
        </div>
      </div>
    </div>
  );
}
