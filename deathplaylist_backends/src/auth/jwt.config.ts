export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const defaults = ['death-playlist-jwt-secret', 'death-playlist-jwt-secret-change-in-production'];
  if (process.env.NODE_ENV === 'production' && (!secret || defaults.includes(secret))) {
    throw new Error('Set a private JWT_SECRET before starting production');
  }
  return secret || defaults[0];
}
