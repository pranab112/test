import { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  loading = false,
  fullWidth = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = clsx(
    'font-bold py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] touch-manipulation',
    {
      'btn-primary': variant === 'primary',
      'btn-secondary': variant === 'secondary',
      'btn-danger': variant === 'danger',
      'w-full': fullWidth,
    },
    className
  );

  return (
    <button className={baseClasses} disabled={disabled || loading} {...props}>
      {loading ? (
        <div className="flex items-center justify-center gap-2">
          <div className="spinner w-5 h-5" />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
}
