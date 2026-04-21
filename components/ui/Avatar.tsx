'use client';

interface AvatarUser {
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
}

interface AvatarProps {
  user: AvatarUser;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-[12px]',
  md: 'w-10 h-10 text-[14px]',
  lg: 'w-16 h-16 text-[24px]',
};

/**
 * Shared avatar primitive — arcade gradient tile with a first-letter fallback,
 * or an <img> if avatar_url is set. The gradient + neon glow matches the
 * profile hero and nav avatar treatment for visual consistency.
 */
export function Avatar({ user, size = 'sm', className = '' }: AvatarProps) {
  const name = user.display_name || user.username || '';
  const initial = name.charAt(0).toUpperCase() || '?';

  return (
    <div
      className={`
        ${SIZE_CLASS[size]}
        grid place-items-center overflow-hidden shrink-0
        font-display font-extrabold text-[#0a0612]
        ${className}
      `}
      style={{
        background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-magenta))',
        boxShadow: size === 'lg' ? '0 0 20px rgba(54,228,255,0.35)' : 'none',
      }}
    >
      {user.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatar_url} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}
