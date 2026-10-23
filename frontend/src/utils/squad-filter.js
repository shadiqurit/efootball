const normalizeName = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export function filterSquad(rows, query = '') {
  const name = normalizeName(query);
  return name ? rows.filter((player) => normalizeName(player.NAME).includes(name)) : rows;
}
