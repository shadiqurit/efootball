<script setup>
import Icon from '../components/Icon.vue';
import { useWorkspace } from '../composables/useWorkspace.js';
const {
  exportBusy,
  exportPlayers,
  openPlayer,
  query,
  position,
  country,
  sort,
  positions,
  countries,
  total,
  players,
  initials,
  roleClass,
  formatDate,
  openAssign,
  confirmDelete,
  currentPage,
  pageSize,
  maxPage,
} = useWorkspace();
</script>

<template>
  <div class="page-heading">
    <div>
      <span class="eyebrow">THE FOUNDATION OF YOUR GAME</span>
      <h1>Player database<span class="green">.</span></h1>
      <p>Your complete player collection. Ready for the next lineup.</p>
    </div>
    <div class="actions">
      <button class="button secondary" :disabled="exportBusy" @click="exportPlayers">
        <Icon name="export" :size="17" />{{ exportBusy ? 'Exporting…' : 'Export CSV' }}</button
      ><button class="button primary" @click="openPlayer()">
        <Icon name="plus" :size="18" />Add player
      </button>
    </div>
  </div>
  <section class="panel">
    <div class="table-toolbar">
      <div class="search-field">
        <Icon name="search" :size="18" /><input
          v-model="query"
          aria-label="Search players"
          placeholder="Search by name or player code…"
        /><button v-if="query" class="icon-button" aria-label="Clear search" @click="query = ''">
          <Icon name="close" :size="16" />
        </button>
      </div>
      <select v-model="position" aria-label="Filter by position">
        <option value="">All positions</option>
        <option v-for="p in positions" :key="p">{{ p }}</option></select
      ><select v-model="country" aria-label="Filter by country">
        <option value="">All countries</option>
        <option v-for="c in countries" :key="c">{{ c }}</option></select
      ><select v-model="sort" aria-label="Sort players">
        <option value="name">Name A–Z</option>
        <option value="recent">Recently updated</option>
        <option value="country">Country A–Z</option>
      </select>
    </div>
    <div class="table-caption">
      <span
        ><strong>{{ total }}</strong> players found</span
      ><button
        v-if="query || position || country"
        class="text-button"
        @click="
          query = '';
          position = '';
          country = '';
        "
      >
        Clear filters<Icon name="close" :size="13" /></button
      ><span v-else class="muted">Your master collection</span>
    </div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>PLAYER</th>
            <th>POSITION</th>
            <th>COUNTRY</th>
            <th>FOOT / HEIGHT</th>
            <th>GAME IDS</th>
            <th>UPDATED</th>
            <th class="align-right">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in players" :key="p.PLAYER_ID">
            <td>
              <div class="player-cell">
                <span class="player-avatar" :class="roleClass(p.POSITION)">{{
                  initials(p.NAME)
                }}</span>
                <div>
                  <button class="player-name" @click="openPlayer(p)">{{ p.NAME }}</button
                  ><small
                    >#{{ String(p.PLAYER_ID).padStart(4, '0') }} <span>·</span>
                    {{ p.PLAYER_CODE }}</small
                  >
                </div>
              </div>
            </td>
            <td>
              <span class="position-badge" :class="roleClass(p.POSITION)">{{
                p.POSITION_CODE
              }}</span
              ><small class="cell-secondary">{{ p.SUB_POSITION || p.POSITION }}</small>
            </td>
            <td>{{ p.COUNTRY || '—' }}</td>
            <td>
              <span class="capitalize">{{ p.FOOT || '—' }}</span
              ><small class="cell-secondary">{{ p.HEIGHT_CM ? `${p.HEIGHT_CM} cm` : '—' }}</small>
            </td>
            <td>
              <span class="assignment-count">{{ p.ACCOUNT_COUNT || 0 }}</span>
            </td>
            <td class="date-cell">{{ formatDate(p.UPD_DATE) }}</td>
            <td>
              <div class="row-actions">
                <button
                  class="assign-button"
                  @click="openAssign(p)"
                  :aria-label="`Assign ${p.NAME}`"
                >
                  <Icon name="plus" :size="14" />Assign</button
                ><button class="icon-button" @click="openPlayer(p)" :aria-label="`Edit ${p.NAME}`">
                  <Icon name="edit" :size="16" /></button
                ><button
                  class="icon-button danger-hover"
                  @click="confirmDelete('players', p)"
                  :aria-label="`Delete ${p.NAME}`"
                >
                  <Icon name="trash" :size="16" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="!players.length" class="empty">
      <Icon name="users" :size="36" />
      <h3>
        {{
          query || position || country
            ? 'No players match your search.'
            : 'Your collection starts with one player.'
        }}
      </h3>
      <p>
        {{
          query || position || country
            ? 'Try another name or reset your filters.'
            : 'Add your first player or import your source files using the setup guide.'
        }}
      </p>
      <button
        class="button secondary"
        @click="
          query || position || country
            ? ((query = ''), (position = ''), (country = ''))
            : openPlayer()
        "
      >
        {{ query || position || country ? 'Reset filters' : 'Add player' }}
      </button>
    </div>
    <div class="pagination">
      <span
        >{{ total ? (currentPage - 1) * pageSize + 1 : 0 }}–{{
          Math.min(currentPage * pageSize, total)
        }}
        of {{ total }} players</span
      >
      <div>
        <button
          class="icon-button"
          :disabled="currentPage === 1"
          aria-label="Previous page"
          @click="currentPage--"
        >
          <Icon name="chevron" class="rotate" :size="17" /></button
        ><span>Page {{ currentPage }} of {{ maxPage }}</span
        ><button
          class="icon-button"
          :disabled="currentPage >= maxPage"
          aria-label="Next page"
          @click="currentPage++"
        >
          <Icon name="chevron" :size="17" />
        </button>
      </div>
    </div>
  </section>
</template>
