/** Cosmetic display roles that colour a user's name. Keep keys in sync with server/src/roles.js. */
export const ROLE_KEYS = ['alpha', 'sheryl', 'viola', 'elena', 'sara', 'shizuka', 'carol', 'yumina', 'airi'] as const;
export type RoleKey = typeof ROLE_KEYS[number];

export const ROLES: Record<RoleKey, { label: string; description: string }> = {
  alpha:   { label: 'Alpha',   description: 'Vàng kim pha xanh chanh' },
  sheryl:  { label: 'Sheryl',  description: 'Hồng đáng yêu' },
  viola:   { label: 'Viola',   description: 'Tím lan mộng mơ' },
  elena:   { label: 'Elena',   description: 'Bạc lấp lánh' },
  sara:    { label: 'Sara',    description: 'Nâu mật ong' },
  shizuka: { label: 'Shizuka', description: 'Cam dịu ánh nhũ' },
  carol:   { label: 'Carol',   description: 'Hồng pha vàng kim' },
  yumina:  { label: 'Yumina',  description: 'Tím oải hương nhạt' },
  airi:    { label: 'Airi',    description: 'Xanh bạc hà' },
};

export function asRole(value: unknown): RoleKey | null {
  return typeof value === 'string' && (ROLE_KEYS as readonly string[]).includes(value) ? value as RoleKey : null;
}

/** Classes for a username coloured by display role, falling back to the admin gradient, then `fallback`. */
export function userNameClass(role: unknown, isAdmin?: unknown, fallback = 'text-ink-200') {
  const r = asRole(role);
  if (r) return `role-name role-${r}`;
  if (isAdmin) return 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-purple-500';
  return fallback;
}
