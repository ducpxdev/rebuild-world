import { Link } from 'react-router-dom';
import { ROLES, asRole, userNameClass } from '../lib/roles';

interface UserNameProps {
  username: string;
  role?: string | null;
  isAdmin?: unknown;
  /** Link to the user's profile (default). Set false when already inside a link. */
  link?: boolean;
  /** Text classes used when the user has no role and isn't an admin. */
  fallbackClass?: string;
  className?: string;
}

/** A username styled by its display role, linking to the profile page. */
export function UserName({ username, role, isAdmin, link = true, fallbackClass, className = '' }: UserNameProps) {
  const r = asRole(role);
  const title = r ? `${username} · ${ROLES[r].label}` : undefined;
  const nameClass = userNameClass(role, isAdmin, fallbackClass);
  const sparkle = isAdmin ? <span className="inline-block ml-0.5" style={{ animation: 'sparkle 1.5s ease-in-out infinite' }} aria-hidden="true">✨</span> : null;

  if (!link) {
    return <span className={className}><span className={nameClass} title={title}>{username}</span>{sparkle}</span>;
  }
  return (
    <span className={className}>
      <Link
        to={`/user/${encodeURIComponent(username)}`}
        className={`user-link ${nameClass}`}
        title={title ?? `Xem trang cá nhân của ${username}`}
      >
        {username}
      </Link>
      {sparkle}
    </span>
  );
}

interface UserAvatarProps {
  username: string;
  src?: string | null;
  /** Tailwind size classes, e.g. "w-10 h-10" */
  size?: string;
  /** Text size for the initial shown when there's no avatar */
  textSize?: string;
  link?: boolean;
  className?: string;
}

/** Round avatar (or initial) that links to the user's profile. */
export function UserAvatar({ username, src, size = 'w-10 h-10', textSize = 'text-sm', link = true, className = '' }: UserAvatarProps) {
  const inner = src ? (
    <img src={src} alt="" className={`${size} rounded-full object-cover`} />
  ) : (
    <span className={`${size} ${textSize} rounded-full bg-primary-500/15 text-primary-300 font-bold flex items-center justify-center select-none`}>
      {username.charAt(0).toUpperCase() || '?'}
    </span>
  );
  if (!link) return <span className={`shrink-0 ${className}`}>{inner}</span>;
  return (
    <Link
      to={`/user/${encodeURIComponent(username)}`}
      aria-label={`Trang cá nhân của ${username}`}
      title={username}
      className={`shrink-0 rounded-full transition hover:ring-2 hover:ring-primary-500/40 hover:ring-offset-2 hover:ring-offset-surface ${className}`}
    >
      {inner}
    </Link>
  );
}
