<script setup>
import Icon from '../components/Icon.vue';
import { useWorkspace } from '../composables/useWorkspace.js';
import { squadSortFields } from '../utils/squad-sort.js';
const columns = squadSortFields.filter((column) => column.key !== 'code');
const {
  openAccount,
  accounts,
  accountId,
  selectedAccount,
  openAssign,
  squad,
  visibleSquad,
  squadQuery,
  squadSort,
  toggleSquadSort,
  openPlayer,
  initials,
  roleClass,
  openSquadStyle,
  openPlayingStyles,
  exportSquad,
  squadExportBusy,
  confirmDelete,
  openRating,
  openHistory,
} = useWorkspace();
</script>

<template>
  <div class="page-heading">
    <div>
      <span class="eyebrow">ONE GAME. ALL YOUR ACCOUNTS.</span>
      <h1>Game IDs & squads<span class="accent-text">.</span></h1>
      <p>Give every account a squad of its own.</p>
    </div>
    <div class="actions">
      <button class="button secondary" @click="openPlayingStyles()">
        <Icon name="target" :size="18" />Playing styles
      </button>
      <button class="button primary" @click="openAccount()">
        <Icon name="plus" :size="18" />Add game ID
      </button>
    </div>
  </div>
  <div class="game-card-grid" :class="{ 'is-empty': !accounts.length }">
    <button
      v-for="(a, i) in accounts"
      :key="a.ID"
      class="game-card"
      :class="{ selected: Number(accountId) === a.ID }"
      @click="accountId = a.ID"
    >
      <div>
        <span class="account-emblem" :class="`emblem-${i % 3}`"
          ><Icon name="shield" :size="25" /></span
        ><span class="platform-tag">{{ a.PLATFORM }}</span
        ><span v-if="Number(accountId) === a.ID" class="selected-check"
          ><Icon name="check" :size="14"
        /></span>
      </div>
      <h3>{{ a.LABEL }}</h3>
      <p>{{ a.GAME_ID }}</p>
      <footer>
        <span
          ><strong>{{ a.PLAYER_COUNT }}</strong> players</span
        ><span
          ><strong>{{ a.AVG_RATING ?? '—' }}</strong> avg. rating</span
        >
      </footer></button
    ><button class="game-card new-game-card" @click="openAccount()">
      <Icon name="plus" :size="30" /><strong>A new game, a new squad.</strong
      ><span>Add a game ID</span>
    </button>
  </div>
  <section v-if="selectedAccount" class="panel">
    <div class="panel-heading squad-heading">
      <div>
        <span class="eyebrow">SELECTED SQUAD</span>
        <h3>{{ selectedAccount.LABEL }}</h3>
        <p>{{ selectedAccount.NOTES || 'Your players. Your lineup. Your next win.' }}</p>
      </div>
      <div class="actions">
        <div class="search-field squad-search">
          <Icon name="search" :size="18" />
          <input
            v-model="squadQuery"
            class="search-input"
            aria-label="Search selected squad by player name"
            placeholder="Search player name…"
            maxlength="100"
          />
          <button
            v-if="squadQuery"
            type="button"
            class="icon-button"
            aria-label="Clear squad search"
            @click="squadQuery = ''"
          >
            <Icon name="close" :size="16" />
          </button>
        </div>
        <button
          class="button secondary"
          :disabled="squadExportBusy || !visibleSquad.length"
          :title="squadQuery.trim() ? 'Export matching players' : 'Export all squad players'"
          @click="exportSquad()"
        >
          <Icon name="export" :size="17" />{{ squadExportBusy ? 'Exporting…' : 'Export CSV' }}
        </button>
        <button class="icon-button" aria-label="Edit game ID" @click="openAccount(selectedAccount)">
          <Icon name="edit" :size="18" /></button
        ><button
          class="icon-button danger-hover"
          aria-label="Delete game ID"
          @click="confirmDelete('accounts', selectedAccount)"
        >
          <Icon name="trash" :size="18" /></button
        ><button class="button primary" @click="openAssign()">
          <Icon name="plus" :size="17" />Assign player
        </button>
      </div>
    </div>
    <p v-if="squadQuery.trim()" class="squad-filter-status" role="status">
      Showing {{ visibleSquad.length }} of {{ squad.length }} players
    </p>
    <div class="table-scroll squad-table">
      <table role="table">
        <thead role="rowgroup">
          <tr role="row">
            <th
              v-for="column in columns"
              :key="column.key"
              role="columnheader"
              :aria-sort="
                squadSort === `${column.key}-asc`
                  ? 'ascending'
                  : squadSort === `${column.key}-desc`
                    ? 'descending'
                    : 'none'
              "
            >
              <button
                type="button"
                class="column-sort"
                @click="toggleSquadSort(column.key)"
                :aria-label="`Sort by ${column.label}`"
              >
                {{ column.label
                }}<Icon
                  name="down"
                  :size="14"
                  :class="{
                    'sort-active': squadSort.startsWith(`${column.key}-`),
                    'sort-ascending': squadSort === `${column.key}-asc`,
                  }"
                />
              </button>
            </th>
            <th role="columnheader" class="align-right">ACTIONS</th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          <tr role="row" v-for="p in visibleSquad" :key="p.ASSIGNMENT_ID">
            <td role="cell" data-label="Player">
              <div class="player-cell">
                <span class="player-avatar" :class="roleClass(p.POSITION)">{{
                  initials(p.NAME)
                }}</span>
                <div>
                  <button class="player-name" @click="openPlayer(p)">{{ p.NAME }}</button
                  ><small>{{ p.PLAYER_CODE }}</small>
                </div>
              </div>
            </td>
            <td role="cell" data-label="Position">
              <span class="position-badge" :class="roleClass(p.POSITION)">{{
                p.POSITION_CODE
              }}</span>
            </td>
            <td role="cell" data-label="Country">{{ p.COUNTRY || '—' }}</td>
            <td role="cell" data-label="Playing style">
              <button
                class="playing-style-button"
                @click="openSquadStyle(p)"
                :aria-label="`Edit playing style for ${p.NAME}`"
              >
                {{ p.PLAYING_STYLE || 'Not specified' }}<Icon name="edit" :size="14" />
              </button>
            </td>
            <td role="cell" data-label="Rating">
              <button
                class="rating-badge"
                @click="openRating(p)"
                :aria-label="`Edit rating for ${p.NAME}`"
              >
                {{ p.RATING }}
              </button>
            </td>
            <td role="cell" data-label="Actions" class="actions-cell">
              <div class="row-actions">
                <button class="assign-button" @click="openRating(p)">
                  <Icon name="edit" :size="14" />Rate</button
                ><button
                  class="icon-button"
                  @click="openHistory(p)"
                  :aria-label="`Rating history for ${p.NAME}`"
                >
                  <Icon name="history" :size="17" /></button
                ><button
                  class="icon-button danger-hover"
                  @click="confirmDelete('assignments', p)"
                  :aria-label="`Remove ${p.NAME} from squad`"
                >
                  <Icon name="trash" :size="17" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="!squad.length" class="empty">
      <Icon name="users" :size="36" />
      <h3>A blank team sheet. Endless potential.</h3>
      <p>Assign players from your master database to build this squad.</p>
      <button class="button secondary" @click="openAssign()">Assign your first player</button>
    </div>
    <div v-else-if="!visibleSquad.length" class="empty">
      <Icon name="search" :size="36" />
      <h3>No matching players</h3>
      <p>Try another name or clear your search.</p>
      <button type="button" class="button secondary" @click="squadQuery = ''">Clear search</button>
    </div>
  </section>
</template>
