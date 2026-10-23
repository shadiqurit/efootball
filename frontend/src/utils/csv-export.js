export const playerFields = [
  'PLAYER_ID',
  'FIRST_NAME',
  'LAST_NAME',
  'NAME',
  'PLAYER_CODE',
  'COUNTRY',
  'DOB',
  'SUB_POSITION',
  'POSITION',
  'FOOT',
  'HEIGHT_CM',
  'POSITIONS',
  'POSITION_CODE',
  'UPD_DATE',
  'UPD_BY',
];
export const squadFields = [
  'GAME_ACCOUNT_ID',
  'SQUAD_NAME',
  'GAME_ID',
  'PLATFORM',
  'SQUAD_NOTES',
  ...playerFields,
  'ASSIGNMENT_ID',
  'RATING',
  'PLAYING_STYLE_ID',
  'PLAYING_STYLE',
  'ASSIGNED_AT',
  'RATING_UPDATED_AT',
];

export function squadExportRows(account, players) {
  return players.map((p) => ({
    ...p,
    GAME_ACCOUNT_ID: account.ID,
    SQUAD_NAME: account.LABEL,
    GAME_ID: account.GAME_ID,
    PLATFORM: account.PLATFORM,
    SQUAD_NOTES: account.NOTES,
    PLAYING_STYLE: p.PLAYING_STYLE || 'Not specified',
    RATING_UPDATED_AT: p.UPDATED_AT,
  }));
}

export function toCsv(fields, rows) {
  const cell = (value) => {
    let text = String(value ?? '');
    // Excel must treat player-controlled values as text rather than formulas.
    if (/^(\s*[=+\-@]|[\t\r\n])/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return (
    '\uFEFF' +
    [
      fields.map(cell).join(','),
      ...rows.map((row) => fields.map((f) => cell(row[f])).join(',')),
    ].join('\r\n')
  );
}

export function downloadCsv(fields, rows, filename) {
  const url = URL.createObjectURL(
    new Blob([toCsv(fields, rows)], { type: 'text/csv;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
