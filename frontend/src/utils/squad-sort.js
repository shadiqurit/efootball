export const squadSortFields = [
  { key: 'name', field: 'NAME', label: 'Player' },
  { key: 'code', field: 'PLAYER_CODE', label: 'Player code' },
  { key: 'position', field: 'POSITION_CODE', label: 'Position' },
  { key: 'country', field: 'COUNTRY', label: 'Country' },
  { key: 'style', field: 'PLAYING_STYLE', label: 'Playing style' },
  { key: 'rating', field: 'RATING', label: 'Rating' },
];

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
const missing = (value) => value == null || String(value).trim() === '';

export function sortSquad(rows, order = 'rating-desc') {
  const [key, direction] = order.split('-');
  const column = squadSortFields.find((item) => item.key === key);
  if (!column || !['asc', 'desc'].includes(direction)) return sortSquad(rows);
  const sign = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = a[column.field],
      right = b[column.field];
    // Keep unassigned styles and missing source data at the end in both directions.
    if (missing(left) !== missing(right)) return missing(left) ? 1 : -1;
    const difference = missing(left)
      ? 0
      : key === 'rating'
        ? Number(left) - Number(right)
        : collator.compare(String(left), String(right));
    return (
      difference * sign ||
      collator.compare(a.NAME || '', b.NAME || '') ||
      Number(a.ASSIGNMENT_ID || 0) - Number(b.ASSIGNMENT_ID || 0)
    );
  });
}
