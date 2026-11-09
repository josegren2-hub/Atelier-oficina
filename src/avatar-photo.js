/** Public circular portraits (same filenames as Oficina-bots /avatares). */
export function avatarPhotoUrl(id) {
  if (typeof id !== 'string' || !id) return '';
  return `./avatares/${encodeURIComponent(id)}.webp`;
}
