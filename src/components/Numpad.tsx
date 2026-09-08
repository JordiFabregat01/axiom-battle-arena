export type NumpadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'back' | 'neg' | 'enter' | 'skip';

/** Touch keypad for phones and tablets. Physical keyboards work everywhere. */
export function Numpad({ onKey }: { onKey: (k: NumpadKey) => void }) {
  const press = (k: NumpadKey) => (e: React.MouseEvent) => { e.preventDefault(); onKey(k); };
  return (
    <div className="numpad" aria-label="Number pad">
      {(['7', '8', '9'] as const).map((k) => <button type="button" key={k} onPointerDown={press(k)}>{k}</button>)}
      <button type="button" onPointerDown={press('back')} aria-label="Backspace">⌫</button>
      {(['4', '5', '6'] as const).map((k) => <button type="button" key={k} onPointerDown={press(k)}>{k}</button>)}
      <button type="button" className="skip" onPointerDown={press('skip')}>Skip</button>
      {(['1', '2', '3'] as const).map((k) => <button type="button" key={k} onPointerDown={press(k)}>{k}</button>)}
      <button type="button" className="enter" onPointerDown={press('enter')} aria-label="Submit">↵</button>
      <button type="button" onPointerDown={press('neg')} aria-label="Toggle sign">±</button>
      <button type="button" onPointerDown={press('0')} style={{ gridColumn: 'span 2' }}>0</button>
    </div>
  );
}
