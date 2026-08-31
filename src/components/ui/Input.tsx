import { InputHTMLAttributes, forwardRef, useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

/**
 * Motion literals pending the theme tokens — see the note in Button.tsx.
 *
 * A field has no press state, so the only motion it owes the user is the
 * border and ring answering focus, and that has to be fast enough to feel
 * like a consequence of the tap rather than an event of its own: 120ms.
 *
 * The transition names its properties instead of using `transition-all`. The
 * ring is a box-shadow, and `all` would have swept in anything else the field
 * might animate later — including layout properties when an error message
 * changes the block's height.
 */
const FIELD_MOTION =
  'transition-[border-color,box-shadow,background-color] duration-fast ease-[cubic-bezier(0.22,0.8,0.25,1)]';

// Web-only, because `:hover` sticks to the last-tapped element on Android.
const FIELD_HOVER = '[@media(hover:hover)]:hover:border-mystic-500/70';

/**
 * The error message is the one genuinely new piece of state on this component,
 * and it used to appear between two frames. It now enters on 160ms — the
 * shortest thing in the primitives that is still an entrance — so the eye is
 * pulled to it without the text feeling like it teleported in.
 *
 * framer rather than a keyframe because the element mounts fresh and a CSS
 * transition has no "from" to run from. `useReducedMotion` because the global
 * CSS block in index.css cannot reach framer's inline styles.
 */
function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  const reduce = !!useReducedMotion();
  return (
    <motion.p
      id={id}
      // Announced when it appears, so the error reaches someone who cannot
      // see the border turn red. `polite` rather than `assertive`: it should
      // wait for a pause in speech, not interrupt mid-word.
      role="status"
      aria-live="polite"
      initial={reduce ? false : { opacity: 0, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: [0.22, 0.8, 0.25, 1] }}
      className="mt-2 text-sm text-red-400"
    >
      {children}
    </motion.p>
  );
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', id, ...props }, ref) => {
    // The label used to be a bare <label> with no htmlFor beside an <input>
    // with no id, so it was decorative: nothing associated the two. Screen
    // readers fell back to the placeholder for the accessible name — and a
    // placeholder vanishes the moment you start typing, which is when you
    // most need to know which field you are in. A caller-supplied id still
    // wins, so existing markup keeps its own anchors.
    const autoId = useId();
    const inputId = id ?? autoId;
    const errorId = `${inputId}-error`;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-mystic-300 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-mystic-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={`
              w-full bg-mystic-800/50 border border-mystic-600/50 rounded-xl
              px-4 py-3 text-mystic-100 placeholder-mystic-500
              ${FIELD_MOTION} ${FIELD_HOVER}
              focus:outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/20
              disabled:opacity-50 disabled:cursor-not-allowed
              ${icon ? 'pl-12' : ''}
              ${error ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && <FieldError id={errorId}>{error}</FieldError>}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    const errorId = `${fieldId}-error`;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={fieldId} className="block text-sm font-medium text-mystic-300 mb-2">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`
            w-full bg-mystic-800/50 border border-mystic-600/50 rounded-xl
            px-4 py-3 text-mystic-100 placeholder-mystic-500
            resize-none
            ${FIELD_MOTION} ${FIELD_HOVER}
            focus:outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/20
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''}
            ${className}
          `}
          {...props}
        />
        {error && <FieldError id={errorId}>{error}</FieldError>}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
