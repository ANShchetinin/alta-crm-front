import type { CSSProperties } from 'react';
import type { UserProfileSummary } from './hooks/useUserProfile';

interface UserAvatarProps {
  profile: UserProfileSummary;
  className?: string;
  style?: CSSProperties;
  /** Рамка вокруг фотографии (без фото рамки нет). */
  photoBorder: string;
  /** Фон без фотографии; по умолчанию — из CSS-класса. */
  initialsBackground?: string;
}

/** Фото пользователя или первая буква имени. */
export const UserAvatar = ({ profile, className, style, photoBorder, initialsBackground }: UserAvatarProps) => (
  <div
    className={className}
    style={{
      ...style,
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: profile.avatarUrl ? 'transparent' : initialsBackground,
      border: profile.avatarUrl ? photoBorder : undefined
    }}
  >
    {profile.avatarUrl ? (
      <img src={profile.avatarUrl} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    ) : (
      profile.name.charAt(0).toUpperCase()
    )}
  </div>
);
