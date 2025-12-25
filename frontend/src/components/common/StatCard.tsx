import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: 'gold' | 'blue' | 'green' | 'red' | 'purple' | 'warning' | 'success' | 'info' | 'error';
  onClick?: () => void;
}

export function StatCard({ title, value, icon, trend, color = 'gold', onClick }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    gold: 'border-gold-600 bg-gold-900/10 text-gold-500',
    warning: 'border-gold-600 bg-gold-900/10 text-gold-500',
    blue: 'border-blue-600 bg-blue-900/10 text-blue-500',
    info: 'border-blue-600 bg-blue-900/10 text-blue-500',
    green: 'border-green-600 bg-green-900/10 text-green-500',
    success: 'border-green-600 bg-green-900/10 text-green-500',
    red: 'border-red-600 bg-red-900/10 text-red-500',
    error: 'border-red-600 bg-red-900/10 text-red-500',
    purple: 'border-purple-600 bg-purple-900/10 text-purple-500',
  };

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={`bg-dark-200 border-2 ${colorClasses[color].split(' ')[0]} ${colorClasses[color].split(' ')[1]} rounded-lg p-6 hover:shadow-gold transition-all ${onClick ? 'cursor-pointer hover:scale-105' : ''}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="text-gray-400 text-sm font-medium uppercase tracking-wide">
          {title}
        </div>
        <div className={`${colorClasses[color].split(' ')[2]} text-2xl`}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-white mb-2">
        {value}
      </div>
      {trend && (
        <div className={`text-sm flex items-center gap-1 ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
          <span>{trend.isPositive ? '↑' : '↓'}</span>
          <span>{trend.value}</span>
        </div>
      )}
    </Component>
  );
}
