import { useEffect, useState } from 'react';
import { validateName, NAME_MAX, NAME_RULES } from '../engine/names';
import { arenaSocket, onlineEnabled } from '../net/socket';
import type { ServerMessage } from '../shared/protocol';

export type NameState = { status: 'empty' } | { status: 'invalid'; reason: string } | { status: 'checking' } | { status: 'taken'; reason: string } | { status: 'ok'; name: string };

interface Props {
  value: string;
  onChange: (value: string) => void;
  onState?: (state: NameState) => void;
  /** Current name, so keeping it is not reported as "taken". */
  current?: string;
  id?: string;
  autoFocus?: boolean;
  placeholder?: string;
}

/** Username input with the shared rules, and (in server mode) a live availability check. */
export function NameField({ value, onChange, onState, current, id = 'name', autoFocus, placeholder = 'e.g. prime_hunter' }: Props) {
  const [state, setState] = useState<NameState>({ status: 'empty' });

  useEffect(() => {
    const trimmed = value.trim();
    let next: NameState;
    if (!trimmed) next = { status: 'empty' };
    else {
      const v = validateName(trimmed);
      next = v.ok ? { status: 'ok', name: v.name } : { status: 'invalid', reason: v.reason };
    }
    if (next.status !== 'ok' || !onlineEnabled || !arenaSocket || (current && trimmed.toLowerCase() === current.toLowerCase())) {
      setState(next);
      onState?.(next);
      return;
    }
    setState({ status: 'checking' });
    onState?.({ status: 'checking' });
    let cancelled = false;
    const t = window.setTimeout(() => {
      arenaSocket!.request<Extract<ServerMessage, { type: 'name_status' }>>({ type: 'check_name', name: trimmed, reqId: '' })
        .then((m) => {
          if (cancelled) return;
          const s: NameState = m.available ? { status: 'ok', name: m.name } : { status: 'taken', reason: m.reason ?? 'That name is already taken.' };
          setState(s);
          onState?.(s);
        })
        .catch(() => { if (!cancelled) { setState(next); onState?.(next); } });
    }, 350);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [value, current, onState]);

  const tone = state.status === 'ok' ? 'var(--cool)' : state.status === 'invalid' || state.status === 'taken' ? 'var(--hot)' : 'var(--chalk-faint)';
  const hint = state.status === 'invalid' || state.status === 'taken' ? state.reason : state.status === 'checking' ? 'Checking availability…' : state.status === 'ok' ? (onlineEnabled && !(current && value.trim().toLowerCase() === current.toLowerCase()) ? 'Available' : 'Looks good') : NAME_RULES;

  return (
    <div className="stack" style={{ gap: '0.35rem' }}>
      <input
        id={id}
        className="text-input"
        maxLength={NAME_MAX}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\s+/g, ''))}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        aria-describedby={`${id}-hint`}
        style={{ borderColor: state.status === 'invalid' || state.status === 'taken' ? 'rgba(255,92,58,0.7)' : undefined }}
      />
      <p id={`${id}-hint`} style={{ fontSize: '0.8rem', color: tone, minHeight: '1.2em' }}>{hint}</p>
    </div>
  );
}
