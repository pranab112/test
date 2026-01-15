import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: 'green' | 'lime' | 'blue' | 'red' | 'purple' | 'warning' | 'success' | 'info' | 'error';
  onClick?: () => void;
}

export function StatCard({ title, value, icon, trend, color = 'green', onClick }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    green: 'border-emerald-600 bg-emerald-900/10 text-emerald-500',
    lime: 'border-lime-500 bg-lime-900/10 text-lime-400',
    success: 'border-emerald-600 bg-emerald-900/10 text-emerald-500',
    blue: 'border-blue-600 bg-blue-900/10 text-blue-500',
    info: 'border-blue-600 bg-blue-900/10 text-blue-500',
    warning: 'border-yellow-600 bg-yellow-900/10 text-yellow-500',
    red: 'border-red-600 bg-red-900/10 text-red-500',
    error: 'border-red-600 bg-red-900/10 text-red-500',
    purple: 'border-purple-600 bg-purple-900/10 text-purple-500',
  };

  const Component = onClick ? 'button' : 'div';
  const colorClass = colorClasses[color] || colorClasses['green'];
  const [borderClass, bgClass, textClass] = colorClass.split(' ');

  return (
    <Component
      onClick={onClick}
      className={`bg-dark-700 border-2 ${borderClass} ${bgClass} rounded-xl p-6 hover:shadow-green transition-all ${onClick ? 'cursor-pointer hover:scale-105' : ''}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="text-gray-400 text-sm font-medium uppercase tracking-wide">
          {title}
        </div>
        <div className={`${textClass} text-2xl`}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-white mb-2">
        {value}
      </div>
      {trend && (
        <div className={`text-sm flex items-center gap-1 ${trend.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          <span>{trend.isPositive ? '↑' : '↓'}</span>
          <span>{trend.value}</span>
        </div>
      )}
    </Component>
  );
}
