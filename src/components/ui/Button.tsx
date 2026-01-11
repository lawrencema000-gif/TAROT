import { ButtonHTMLAttributes, forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'gold' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  glow?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-gold text-mystic-950 hover:bg-gold-light active:bg-gold-dark shadow-glow hover:shadow-glow-md',
  secondary: 'bg-mystic-700 text-mystic-100 hover:bg-mystic-600 active:bg-mystic-800',
  ghost: 'bg-transparent text-mystic-300 hover:bg-mystic-800 hover:text-mystic-100',
  outline: 'bg-transparent border border-gold/30 text-gold hover:border-gold/60 hover:shadow-glow',
  gold: 'bg-gradient-to-r from-gold-dark via-gold to-gold-light text-mystic-950 shadow-glow-md hover:shadow-glow-lg',
  destructive: 'bg-coral text-white hover:bg-coral-light active:bg-coral-dark shadow-glow-coral',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-base',
  lg: 'px-7 py-3.5 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, fullWidth, className = '', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center gap-2 font-medium rounded-xl
          transition-all duration-200 ease-out
          focus:outline-none focus:ring-2 focus:ring-gold/50 focus:ring-offset-2 focus:ring-offset-mystic-950
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variants[variant]}
          ${sizes[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
