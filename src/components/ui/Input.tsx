import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-mystic-300 mb-2">
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
            className={`
              w-full bg-mystic-800/50 border border-mystic-600/50 rounded-xl
              px-4 py-3 text-mystic-100 placeholder-mystic-500
              transition-all duration-200
              focus:outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/20
              disabled:opacity-50 disabled:cursor-not-allowed
              ${icon ? 'pl-12' : ''}
              ${error ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-400">{error}</p>
        )}
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
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-mystic-300 mb-2">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={`
            w-full bg-mystic-800/50 border border-mystic-600/50 rounded-xl
            px-4 py-3 text-mystic-100 placeholder-mystic-500
            transition-all duration-200 resize-none
            focus:outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/20
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-2 text-sm text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';
