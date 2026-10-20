import { ref, computed, watch, onMounted, onBeforeUnmount, provide, inject } from 'vue';
import { api, isDemo } from '../api.js';
import { nav, positions, pageSize } from '../config/workspace.js';
import { initials, roleClass, formatDate } from '../utils/player-format.js';

const workspaceKey = Symbol('touchline-workspace');

// The application owns one workspace. Screens share its refs and actions.
export function provideWorkspace() {
  const workspace = createWorkspace();
  provide(workspaceKey, workspace);
  return workspace;
}

export function useWorkspace() {
  const workspace = inject(workspaceKey);
  if (!workspace) throw new Error('Workspace screens must be inside the application provider.');
  return workspace;
}

function createWorkspace() {
  const initialPage = location.hash.slice(1);
  const page = ref(nav.some((n) => n.id === initialPage) ? initialPage : 'dashboard');
  const mobileNav = ref(false),
    user = ref(null),
    booting = ref(true),
    loading = ref(false),
    error = ref(''),
    toast = ref('');
  const login = ref({ email: '', password: '' }),
    loginBusy = ref(false);
  const stats = ref({ positions: [], topPlayers: [], activity: [] }),
    accounts = ref([]),
    players = ref([]),
    total = ref(0),
    countries = ref([]),
    squad = ref([]);
  const query = ref(''),
    position = ref(''),
    country = ref(''),
    sort = ref('name'),
    currentPage = ref(1),
    accountId = ref(''),
    analyticsId = ref('');
  const modal = ref(null),
    form = ref({}),
    formError = ref(''),
    saving = ref(false),
    history = ref([]),
    assignOptions = ref([]),
    assignQuery = ref('');
  const selectedAccount = computed(() =>
    accounts.value.find((a) => a.ID === Number(accountId.value)),
  );
  const pageTitle = computed(() => nav.find((n) => n.id === page.value)?.name);
  const maxPage = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));
  let toastTimer,
    searchTimer,
    assignTimer,
    playerRequest = 0,
    squadRequest = 0,
    statsRequest = 0;
  function notify(message) {
    toast.value = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.value = ''), 4000);
  }
  function navigate(target) {
    location.hash = target;
    page.value = target;
    mobileNav.value = false;
    error.value = '';
  }
  function syncHash() {
    const value = location.hash.slice(1);
    if (nav.some((n) => n.id === value)) page.value = value;
  }
  async function guarded(fn) {
    error.value = '';
    try {
      return await fn();
    } catch (err) {
      if (err.status === 401) user.value = null;
      else error.value = err.message;
    }
  }
  async function loadPlayers() {
    const request = ++playerRequest;
    const params = new URLSearchParams({
      q: query.value,
      position: position.value,
      country: country.value,
      sort: sort.value,
      page: currentPage.value,
      limit: pageSize,
    });
    const data = await api(`/players?${params}`);
    if (request === playerRequest) {
      players.value = data.rows;
      total.value = data.total;
    }
  }
  async function loadSquad() {
    const request = ++squadRequest;
    if (!accountId.value) {
      squad.value = [];
      return;
    }
    const data = await api(`/assignments?accountId=${accountId.value}`);
    if (request === squadRequest) squad.value = data;
  }
  async function loadStats() {
    const request = ++statsRequest;
    const data = await api(
      `/analytics${page.value === 'analytics' && analyticsId.value ? `?accountId=${analyticsId.value}` : ''}`,
    );
    if (request === statsRequest) stats.value = data;
  }
  async function refresh() {
    loading.value = true;
    try {
      const [a, filters] = await Promise.all([api('/accounts'), api('/filters')]);
      accounts.value = a;
      countries.value = filters.countries;
      if (!a.some((g) => g.ID === Number(accountId.value))) accountId.value = a[0]?.ID || '';
      if (analyticsId.value && !a.some((g) => g.ID === Number(analyticsId.value)))
        analyticsId.value = '';
      await Promise.all([loadPlayers(), loadStats(), loadSquad()]);
    } finally {
      loading.value = false;
    }
  }
  async function signIn() {
    loginBusy.value = true;
    error.value = '';
    try {
      user.value = await api('/auth/login', 'POST', login.value);
      login.value.password = '';
      await refresh();
    } catch (err) {
      error.value = err.message;
    } finally {
      loginBusy.value = false;
    }
  }
  async function signOut() {
    await guarded(async () => {
      await api('/auth/logout', 'POST', {});
      user.value = null;
    });
  }
  function closeModal() {
    if (!saving.value) {
      modal.value = null;
      formError.value = '';
    }
  }
  function openPlayer(p) {
    form.value = p
      ? Object.fromEntries(
          [
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
          ].map((k) => [k, p[k] ?? '']),
        )
      : {
          FIRST_NAME: '',
          LAST_NAME: '',
          NAME: '',
          PLAYER_CODE: '',
          COUNTRY: '',
          DOB: '',
          SUB_POSITION: '',
          POSITION: 'Attack',
          FOOT: '',
          HEIGHT_CM: '',
          POSITIONS: '',
          POSITION_CODE: 'CF',
        };
    formError.value = '';
    modal.value = { type: 'player', title: p ? 'Edit player' : 'Add a new player' };
  }
  function suggestCode() {
    if (!form.value.PLAYER_ID && !form.value.PLAYER_CODE)
      form.value.PLAYER_CODE = form.value.NAME.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
  }
  function openAccount(a) {
    form.value = a
      ? { ID: a.ID, LABEL: a.LABEL, GAME_ID: a.GAME_ID, PLATFORM: a.PLATFORM, NOTES: a.NOTES || '' }
      : { LABEL: '', GAME_ID: '', PLATFORM: 'Mobile', NOTES: '' };
    formError.value = '';
    modal.value = { type: 'account', title: a ? 'Edit game ID' : 'Add a game ID' };
  }
  async function openAssign(p) {
    if (!accounts.value.length) {
      notify('Add a game ID first.');
      navigate('games');
      return;
    }
    form.value = {
      PLAYER_ID: p?.PLAYER_ID || '',
      GAME_ACCOUNT_ID: accountId.value || accounts.value[0].ID,
      RATING: 90,
    };
    assignQuery.value = '';
    assignOptions.value = p ? [p] : [];
    formError.value = '';
    modal.value = { type: 'assign', title: 'Build your squad', player: p };
    if (!p) {
      try {
        await searchAssign();
      } catch (err) {
        formError.value = err.message;
      }
    }
  }
  let assignRequest = 0;
  async function searchAssign() {
    const request = ++assignRequest;
    const data = await api(`/players?limit=100&q=${encodeURIComponent(assignQuery.value)}`);
    if (request === assignRequest) assignOptions.value = data.rows;
  }
  function scheduleAssign() {
    clearTimeout(assignTimer);
    assignTimer = setTimeout(
      () => searchAssign().catch((err) => (formError.value = err.message)),
      250,
    );
  }
  function openRating(p) {
    form.value = { ID: p.ASSIGNMENT_ID, RATING: p.RATING };
    formError.value = '';
    modal.value = { type: 'rating', title: 'Declare player rating', player: p };
  }
  async function openHistory(p) {
    history.value = [];
    formError.value = '';
    modal.value = { type: 'history', title: 'Rating history', player: p };
    try {
      history.value = await api(`/assignments/${p.ASSIGNMENT_ID}/history`);
    } catch (err) {
      formError.value = err.message;
    }
  }
  function confirmDelete(kind, record) {
    formError.value = '';
    modal.value = {
      type: 'delete',
      title:
        kind === 'assignments'
          ? 'Remove from squad?'
          : kind === 'accounts'
            ? 'Delete game ID?'
            : 'Delete player?',
      kind,
      record,
    };
  }
  async function save() {
    saving.value = true;
    formError.value = '';
    let message;
    try {
      const f = { ...form.value },
        kind = modal.value.type;
      if (kind === 'player') {
        const playerId = f.PLAYER_ID;
        delete f.PLAYER_ID;
        f.DOB = f.DOB || null;
        f.FOOT = f.FOOT || null;
        f.HEIGHT_CM = f.HEIGHT_CM === '' || f.HEIGHT_CM == null ? null : Number(f.HEIGHT_CM);
        await api(`/players${playerId ? `/${playerId}` : ''}`, playerId ? 'PUT' : 'POST', f);
        message = playerId ? 'Player details updated.' : 'Player added to your database.';
      } else if (kind === 'account') {
        const aid = f.ID;
        delete f.ID;
        await api(`/accounts${aid ? `/${aid}` : ''}`, aid ? 'PUT' : 'POST', f);
        message = 'Game ID saved.';
      } else if (kind === 'assign') {
        await api('/assignments', 'POST', {
          PLAYER_ID: Number(f.PLAYER_ID),
          GAME_ACCOUNT_ID: Number(f.GAME_ACCOUNT_ID),
          RATING: Number(f.RATING),
        });
        message = 'Player assigned to squad.';
      } else if (kind === 'rating') {
        await api(`/assignments/${f.ID}/rating`, 'PATCH', { RATING: Number(f.RATING) });
        message = 'Rating updated. History recorded.';
      } else if (kind === 'delete') {
        const m = modal.value;
        await api(
          `/${m.kind}/${m.kind === 'players' ? m.record.PLAYER_ID : m.kind === 'assignments' ? m.record.ASSIGNMENT_ID : m.record.ID}`,
          'DELETE',
          {},
        );
        message = 'Record removed.';
      }
      modal.value = null;
      notify(message);
      if (kind === 'delete' && players.value.length === 1 && currentPage.value > 1)
        currentPage.value--;
      await guarded(refresh);
    } catch (err) {
      formError.value = err.message;
    } finally {
      saving.value = false;
    }
  }
  const exportBusy = ref(false);
  async function exportPlayers() {
    exportBusy.value = true;
    await guarded(async () => {
      const rows = [];
      let index = 1,
        count;
      do {
        const data = await api(
          `/players?${new URLSearchParams({ q: query.value, position: position.value, country: country.value, sort: sort.value, page: index++, limit: 100 })}`,
        );
        rows.push(...data.rows);
        count = data.total;
        if (!data.rows.length) break;
      } while (rows.length < count);
      const fields = [
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
      const cell = (v) => {
        let s = String(v ?? '');
        if (/^[=+\-@\t\r\n]/.test(s)) s = "'" + s;
        return '"' + s.replaceAll('"', '""') + '"';
      };
      const url = URL.createObjectURL(
        new Blob(
          [
            '\uFEFF' +
              [fields.join(','), ...rows.map((r) => fields.map((f) => cell(r[f])).join(','))].join(
                '\r\n',
              ),
          ],
          { type: 'text/csv;charset=utf-8' },
        ),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = 'touchline-players.csv';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify(`${rows.length} players exported.`);
    });
    exportBusy.value = false;
  }
  watch([query, position, country, sort], () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      if (currentPage.value !== 1) currentPage.value = 1;
      else guarded(loadPlayers);
    }, 250);
  });
  watch(currentPage, () => guarded(loadPlayers));
  watch(accountId, () => {
    if (user.value) guarded(loadSquad);
  });
  watch(analyticsId, () => guarded(loadStats));
  watch(page, () => {
    if (user.value) guarded(loadStats);
  });
  onMounted(async () => {
    window.addEventListener('hashchange', syncHash);
    try {
      user.value = await api('/auth/me');
      await guarded(refresh);
    } catch (err) {
      if (err.status !== 401) error.value = err.message;
    } finally {
      booting.value = false;
    }
  });
  onBeforeUnmount(() => {
    window.removeEventListener('hashchange', syncHash);
    clearTimeout(searchTimer);
    clearTimeout(assignTimer);
    clearTimeout(toastTimer);
  });
  return {
    nav,
    page,
    mobileNav,
    user,
    booting,
    loading,
    error,
    toast,
    login,
    loginBusy,
    stats,
    accounts,
    players,
    total,
    countries,
    squad,
    query,
    position,
    country,
    sort,
    currentPage,
    accountId,
    analyticsId,
    pageSize,
    modal,
    form,
    formError,
    saving,
    history,
    assignOptions,
    assignQuery,
    positions,
    selectedAccount,
    pageTitle,
    maxPage,
    initials,
    roleClass,
    formatDate,
    navigate,
    guarded,
    refresh,
    signIn,
    signOut,
    closeModal,
    openPlayer,
    suggestCode,
    openAccount,
    openAssign,
    scheduleAssign,
    openRating,
    openHistory,
    confirmDelete,
    save,
    exportBusy,
    exportPlayers,
    isDemo,
  };
}
