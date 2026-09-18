/**
 * Switch: on or off, and it says so.
 *
 * The settings sheet drew its notifications toggle as two divs with a
 * translate — no role, no state, so a screen reader announced a button
 * with no name and no idea whether it was on. This one is a real
 * `role="switch"` with `aria-checked`; Space and Enter toggle it because a
 * button already does that.
 */

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const SIZE = {
  sm: { track: 'w-10 h-6', knob: 'w-5 h-5', on: 'translate-x-4' },
  md: { track: 'w-12 h-7', knob: 'w-6 h-6', on: 'translate-x-5' },
};

export function Switch({
  checked,
  onChange,
  disabled,
  size = 'md',
  className = '',
  ...aria
}: SwitchProps) {
  const s = SIZE[size];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={aria['aria-label']}
      aria-labelledby={aria['aria-labelledby']}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex shrink-0 items-center rounded-full ${s.track}
        transition-colors duration-fast ease-[cubic-bezier(0.22,0.8,0.25,1)]
        select-none touch-manipulation [-webkit-tap-highlight-color:transparent]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-mystic-950
        disabled:opacity-50 disabled:cursor-not-allowed
        ${checked ? 'bg-gold' : 'bg-mystic-700'}
        ${className}
      `}
    >
      <span
        aria-hidden
        className={`
          absolute left-0.5 top-0.5 rounded-full ${s.knob}
          transition-transform duration-fast ease-[cubic-bezier(0.22,0.8,0.25,1)]
          ${checked ? `${s.on} bg-mystic-950` : 'translate-x-0 bg-mystic-200'}
        `}
      />
    </button>
  );
}
