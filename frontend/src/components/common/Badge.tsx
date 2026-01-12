import { ReactNode } from 'react';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default' | 'pending' | 'approved' | 'rejected' | 'purple' | 'danger';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-green-900/20 text-green-400 border-green-700',
  warning: 'bg-yellow-900/20 text-yellow-400 border-yellow-700',
  error: 'bg-red-900/20 text-red-400 border-red-700',
  info: 'bg-blue-900/20 text-blue-400 border-blue-700',
  default: 'bg-dark-300 text-gray-300 border-dark-400',
  pending: 'bg-yellow-900/20 text-yellow-400 border-yellow-700',
  approved: 'bg-green-900/20 text-green-400 border-green-700',
  rejected: 'bg-red-900/20 text-red-400 border-red-700',
  purple: 'bg-purple-900/20 text-purple-400 border-purple-700',
  danger: 'bg-red-900/20 text-red-400 border-red-700',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

const dotVariantStyles: Record<BadgeVariant, string> = {
  success: 'bg-green-400',
  warning: 'bg-yellow-400',
  error: 'bg-red-400',
  info: 'bg-blue-400',
  default: 'bg-gray-400',
  pending: 'bg-yellow-400',
  approved: 'bg-green-400',
  rejected: 'bg-red-400',
  purple: 'bg-purple-400',
  danger: 'bg-red-400',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  dot = false
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && (
        <span className={`w-2 h-2 rounded-full ${dotVariantStyles[variant]} animate-pulse`} />
      )}
      {children}
    </span>
  );
}
