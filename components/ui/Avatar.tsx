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
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-2xl font-serif',
};

/**
 * Shared avatar primitive — bordered circle with an `<img>` if avatar_url is
 * set, otherwise a first-letter fallback. Replaces the ad-hoc markup
 * scattered across the navbar, match modals, and friend list rows.
 */
export function Avatar({ user, size = 'sm', className = '' }: AvatarProps) {
  const name = user.display_name || user.username || '';
  const initial = name.charAt(0).toUpperCase() || '?';

  return (
    <div
      className={`
        ${SIZE_CLASS[size]}
        rounded-full border border-edge-strong bg-inset
        flex items-center justify-center overflow-hidden
        text-ink-secondary shrink-0
        ${className}
      `}
    >
      {user.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatar_url}
          alt={name}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}
