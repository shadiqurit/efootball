// Explicit browser-only preview. Production never uses this data adapter.
import players from './players.json';
// Lightweight preview checks keep this optional adapter independent of the backend.
const required = (value, label, max = 100) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    fail(`${label} is required (maximum ${max} characters).`);
};
const validateRating = (value) => {
  if (!Number.isInteger(value) || value < 1 || value > 120)
    fail('Rating must be a whole number from 1 to 120.');
  return value;
};
function validatePlayer(value) {
  required(value.NAME, 'Name');
  required(value.PLAYER_CODE, 'Player code');
  if (!/^[a-z0-9-]+$/.test(value.PLAYER_CODE))
    fail('Use lowercase letters, numbers and hyphens for the player code.');
  return { ...value };
}
function validateAccount(value) {
  required(value.LABEL, 'Squad name');
  required(value.GAME_ID, 'Game ID');
  return { ...value };
}
function validateAssignment(value) {
  if (
    !Number.isInteger(value.PLAYER_ID) ||
    value.PLAYER_ID < 1 ||
    !Number.isInteger(value.GAME_ACCOUNT_ID) ||
    value.GAME_ACCOUNT_ID < 1
  )
    fail('Choose a player and a game ID.');
  validateRating(value.RATING);
  return { ...value };
}
const key = 'touchline-demo-v1';
function initial() {
  const accounts = [
    {
      ID: 1,
      LABEL: 'Main squad',
      GAME_ID: 'EF-102938475',
      PLATFORM: 'Mobile',
      NOTES: 'My first team. Built for the big games.',
    },
    {
      ID: 2,
      LABEL: 'Road to glory',
      GAME_ID: 'EF-748291036',
      PLATFORM: 'PC',
      NOTES: 'A new challenge, a new starting eleven.',
    },
    {
      ID: 3,
      LABEL: 'Legends club',
      GAME_ID: 'EF-563819204',
      PLATFORM: 'PlayStation',
      NOTES: 'The players who made us love the game.',
    },
  ];
  const assignments = players.slice(0, 22).map((p, i) => ({
    ID: i + 1,
    PLAYER_ID: p.PLAYER_ID,
    GAME_ACCOUNT_ID: i < 12 ? 1 : 2,
    RATING: 88 + ((i * 7) % 15),
    UPDATED_AT: new Date().toISOString(),
  }));
  const history = assignments.map((a) => ({
    ID: a.ID,
    ASSIGNMENT_ID: a.ID,
    OLD_RATING: null,
    NEW_RATING: a.RATING,
    CHANGED_BY_NAME: 'Demo manager',
    CHANGED_AT: a.UPDATED_AT,
  }));
  return { players: structuredClone(players), accounts, assignments, history };
}
let state;
try {
  state = JSON.parse(localStorage.getItem(key));
} catch {
  /* Reset invalid demo storage. */
}
if (!state?.players || !state?.accounts || !state?.assignments || !state?.history)
  state = initial();
const persist = () => localStorage.setItem(key, JSON.stringify(state));
const nextId = (rows) => Math.max(0, ...rows.map((r) => r.ID || r.PLAYER_ID)) + 1;
const fail = (message) => {
  throw new Error(message);
};
const byId = (rows, value, field = 'ID') =>
  rows.find((r) => r[field] === Number(value)) || fail('Record no longer exists.');
export async function demoRequest(path, method, body) {
  await new Promise((r) => setTimeout(r, 100));
  const [route, search] = path.split('?'),
    params = new URLSearchParams(search);
  let out;
  if (route.startsWith('/auth'))
    return { ID: 1, NAME: 'Demo manager', EMAIL: 'demo@touchline.local' };
  if (route === '/filters')
    return { countries: [...new Set(state.players.map((p) => p.COUNTRY).filter(Boolean))].sort() };
  if (route === '/players' && method === 'GET') {
    let rows = state.players.filter(
      (p) =>
        (!params.get('q') ||
          `${p.NAME} ${p.PLAYER_CODE}`.toLowerCase().includes(params.get('q').toLowerCase())) &&
        (!params.get('position') || p.POSITION_CODE === params.get('position')) &&
        (!params.get('country') || p.COUNTRY === params.get('country')),
    );
    rows.sort((a, b) =>
      params.get('sort') === 'recent'
        ? (b.UPD_DATE || '').localeCompare(a.UPD_DATE || '')
        : params.get('sort') === 'country'
          ? (a.COUNTRY || '').localeCompare(b.COUNTRY || '') || a.NAME.localeCompare(b.NAME)
          : a.NAME.localeCompare(b.NAME),
    );
    const total = rows.length,
      limit = Number(params.get('limit') || 12),
      start = (Number(params.get('page') || 1) - 1) * limit;
    return {
      total,
      rows: rows.slice(start, start + limit).map((p) => ({
        ...p,
        ACCOUNT_COUNT: state.assignments.filter((a) => a.PLAYER_ID === p.PLAYER_ID).length,
      })),
    };
  }
  if (/^\/players(?:\/\d+)?$/.test(route)) {
    const playerId = Number(route.split('/')[2]);
    if (method === 'DELETE') {
      if (state.assignments.some((a) => a.PLAYER_ID === playerId))
        fail('Remove this player from all game IDs before deleting.');
      state.players = state.players.filter((p) => p.PLAYER_ID !== playerId);
    } else {
      const p = validatePlayer(body);
      if (state.players.some((r) => r.PLAYER_CODE === p.PLAYER_CODE && r.PLAYER_ID !== playerId))
        fail('This player code already exists.');
      const row = {
        ...p,
        UPD_DATE: new Date().toISOString(),
        PLAYER_ID: playerId || nextId(state.players),
      };
      if (playerId) Object.assign(byId(state.players, playerId, 'PLAYER_ID'), row);
      else state.players.push(row);
      out = row;
    }
  } else if (route === '/accounts' && method === 'GET') {
    return state.accounts.map((g) => {
      const rows = state.assignments.filter((a) => a.GAME_ACCOUNT_ID === g.ID);
      return {
        ...g,
        PLAYER_COUNT: rows.length,
        AVG_RATING: rows.length
          ? Math.round((rows.reduce((s, a) => s + a.RATING, 0) / rows.length) * 10) / 10
          : null,
        BEST_RATING: rows.length ? Math.max(...rows.map((a) => a.RATING)) : null,
      };
    });
  } else if (/^\/accounts(?:\/\d+)?$/.test(route)) {
    const accountId = Number(route.split('/')[2]);
    if (method === 'DELETE') {
      const ids = state.assignments.filter((a) => a.GAME_ACCOUNT_ID === accountId).map((a) => a.ID);
      state.accounts = state.accounts.filter((a) => a.ID !== accountId);
      state.assignments = state.assignments.filter((a) => a.GAME_ACCOUNT_ID !== accountId);
      state.history = state.history.filter((h) => !ids.includes(h.ASSIGNMENT_ID));
    } else {
      const a = validateAccount(body);
      if (state.accounts.some((r) => r.GAME_ID === a.GAME_ID && r.ID !== accountId))
        fail('This game ID already exists.');
      if (accountId) Object.assign(byId(state.accounts, accountId), a);
      else state.accounts.push({ ...a, ID: nextId(state.accounts) });
    }
  } else if (route === '/assignments' && method === 'GET') {
    return state.assignments
      .filter((a) => a.GAME_ACCOUNT_ID === Number(params.get('accountId')))
      .map((a) => ({
        ...byId(state.players, a.PLAYER_ID, 'PLAYER_ID'),
        ASSIGNMENT_ID: a.ID,
        RATING: a.RATING,
        UPDATED_AT: a.UPDATED_AT,
      }))
      .sort((a, b) => b.RATING - a.RATING);
  } else if (route === '/assignments' && method === 'POST') {
    const a = validateAssignment(body);
    byId(state.players, a.PLAYER_ID, 'PLAYER_ID');
    byId(state.accounts, a.GAME_ACCOUNT_ID);
    if (
      state.assignments.some(
        (r) => r.GAME_ACCOUNT_ID === a.GAME_ACCOUNT_ID && r.PLAYER_ID === a.PLAYER_ID,
      )
    )
      fail('This player is already in that squad.');
    const row = { ...a, ID: nextId(state.assignments), UPDATED_AT: new Date().toISOString() };
    state.assignments.push(row);
    state.history.push({
      ID: nextId(state.history),
      ASSIGNMENT_ID: row.ID,
      OLD_RATING: null,
      NEW_RATING: a.RATING,
      CHANGED_BY_NAME: 'Demo manager',
      CHANGED_AT: row.UPDATED_AT,
    });
  } else if (/^\/assignments\/\d+\/history$/.test(route)) {
    return state.history
      .filter((h) => h.ASSIGNMENT_ID === Number(route.split('/')[2]))
      .sort((a, b) => b.ID - a.ID)
      .slice(0, 100);
  } else if (/^\/assignments\/\d+\/rating$/.test(route)) {
    const a = byId(state.assignments, route.split('/')[2]),
      value = validateRating(body.RATING);
    if (a.RATING !== value) {
      state.history.push({
        ID: nextId(state.history),
        ASSIGNMENT_ID: a.ID,
        OLD_RATING: a.RATING,
        NEW_RATING: value,
        CHANGED_BY_NAME: 'Demo manager',
        CHANGED_AT: new Date().toISOString(),
      });
      a.RATING = value;
      a.UPDATED_AT = new Date().toISOString();
    }
  } else if (/^\/assignments\/\d+$/.test(route) && method === 'DELETE') {
    const aid = Number(route.split('/')[2]);
    state.assignments = state.assignments.filter((a) => a.ID !== aid);
    state.history = state.history.filter((h) => h.ASSIGNMENT_ID !== aid);
  } else if (route === '/analytics') {
    const rows = state.assignments.filter(
      (a) => !params.get('accountId') || a.GAME_ACCOUNT_ID === Number(params.get('accountId')),
    );
    const joined = rows.map((a) => ({
      ...byId(state.players, a.PLAYER_ID, 'PLAYER_ID'),
      ...a,
      LABEL: byId(state.accounts, a.GAME_ACCOUNT_ID).LABEL,
    }));
    return {
      PLAYERS: state.players.length,
      ACCOUNTS: state.accounts.length,
      COUNTRIES: new Set(state.players.map((p) => p.COUNTRY).filter(Boolean)).size,
      ASSIGNMENTS: rows.length,
      AVG_RATING: rows.length
        ? Math.round((rows.reduce((s, a) => s + a.RATING, 0) / rows.length) * 10) / 10
        : null,
      BEST_RATING: rows.length ? Math.max(...rows.map((a) => a.RATING)) : null,
      positions: ['Attack', 'Midfield', 'Defender', 'Goalkeeper'].map((POSITION) => {
        const group = joined.filter((p) => p.POSITION === POSITION);
        return {
          POSITION,
          TOTAL: group.length,
          AVG_RATING: group.length
            ? (group.reduce((s, a) => s + a.RATING, 0) / group.length).toFixed(1)
            : null,
        };
      }),
      topPlayers: [...joined].sort((a, b) => b.RATING - a.RATING).slice(0, 5),
      activity: [...state.history]
        .reverse()
        .filter((h) => rows.some((a) => a.ID === h.ASSIGNMENT_ID))
        .slice(0, 8)
        .map((h) => {
          const a = byId(state.assignments, h.ASSIGNMENT_ID);
          return {
            ...h,
            NAME: byId(state.players, a.PLAYER_ID, 'PLAYER_ID').NAME,
            LABEL: byId(state.accounts, a.GAME_ACCOUNT_ID).LABEL,
          };
        }),
    };
  } else fail('Unknown demo action.');
  persist();
  return structuredClone(out || {});
}
