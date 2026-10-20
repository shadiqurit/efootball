export const initials = (name) =>
  name
    ?.split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('') || '?';
export const roleClass = (p) =>
  ({ Attack: 'attack', Midfield: 'midfield', Defender: 'defender', Goalkeeper: 'goalkeeper' })[p] ||
  'defender';
export const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(
    v.length === 10 ? v + 'T00:00:00Z' : v.includes('T') ? v : v.replace(' ', 'T') + 'Z',
  );
  return Number.isNaN(d.valueOf())
    ? '—'
    : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(
        d,
      );
};
