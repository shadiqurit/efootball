<script setup>
import Icon from '../components/Icon.vue';
import { useWorkspace } from '../composables/useWorkspace.js';
const {
  openAccount,
  accounts,
  accountId,
  selectedAccount,
  openAssign,
  squad,
  openPlayer,
  initials,
  roleClass,
  formatDate,
  confirmDelete,
  openRating,
  openHistory,
} = useWorkspace();
</script>

<template>
  <div class="page-heading">
    <div>
      <span class="eyebrow">ONE GAME. ALL YOUR ACCOUNTS.</span>
      <h1>Game IDs & squads<span class="green">.</span></h1>
      <p>Give every account a squad of its own.</p>
    </div>
    <button class="button primary" @click="openAccount()">
      <Icon name="plus" :size="18" />Add game ID
    </button>
  </div>
  <div class="game-card-grid">
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
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>PLAYER</th>
            <th>POSITION</th>
            <th>COUNTRY</th>
            <th>RATING</th>
            <th>LAST RATED</th>
            <th class="align-right">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in squad" :key="p.ASSIGNMENT_ID">
            <td>
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
            <td>
              <span class="position-badge" :class="roleClass(p.POSITION)">{{
                p.POSITION_CODE
              }}</span>
            </td>
            <td>{{ p.COUNTRY || '—' }}</td>
            <td>
              <button
                class="rating-badge"
                @click="openRating(p)"
                :aria-label="`Edit rating for ${p.NAME}`"
              >
                {{ p.RATING }}
              </button>
            </td>
            <td class="date-cell">{{ formatDate(p.UPDATED_AT) }}</td>
            <td>
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
  </section>
</template>
