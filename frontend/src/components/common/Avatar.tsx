import { FaUser } from 'react-icons/fa';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  online?: boolean;
  className?: string;
}

const sizeStyles: Record<AvatarSize, { container: string; text: string; indicator: string }> = {
  sm: {
    container: 'w-8 h-8',
    text: 'text-xs',
    indicator: 'w-2 h-2 bottom-0 right-0',
  },
  md: {
    container: 'w-10 h-10',
    text: 'text-sm',
    indicator: 'w-2.5 h-2.5 bottom-0 right-0',
  },
  lg: {
    container: 'w-12 h-12',
    text: 'text-base',
    indicator: 'w-3 h-3 bottom-0.5 right-0.5',
  },
  xl: {
    container: 'w-16 h-16',
    text: 'text-xl',
    indicator: 'w-4 h-4 bottom-1 right-1',
  },
};

export function Avatar({
  src,
  alt,
  name,
  size = 'md',
  online,
  className = ''
}: AvatarProps) {
  const getInitials = (name?: string): string => {
    if (!name) return '';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const initials = getInitials(name);
  const styles = sizeStyles[size];

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className={`${styles.container} rounded-full overflow-hidden flex items-center justify-center bg-gold-gradient text-dark-700 font-bold ${styles.text} border-2 border-gold-600`}
      >
        {src ? (
          <img
            src={src}
            alt={alt || name || 'User avatar'}
            className="w-full h-full object-cover"
          />
        ) : initials ? (
          <span>{initials}</span>
        ) : (
          <FaUser className="text-dark-600" />
        )}
      </div>
      {online !== undefined && (
        <span
          className={`absolute ${styles.indicator} rounded-full border-2 border-dark-200 ${
            online ? 'bg-green-500' : 'bg-gray-500'
          }`}
        />
      )}
    </div>
  );
}
