<script setup>
import Icon from '../components/Icon.vue';
import { useWorkspace } from '../composables/useWorkspace.js';
const { analyticsId, accounts, stats, initials, roleClass } = useWorkspace();
</script>

<template>
  <div class="page-heading">
    <div>
      <span class="eyebrow">THE NUMBERS BEHIND YOUR SQUAD</span>
      <h1>A little more insight<span class="green">.</span></h1>
      <p>Understand your collection. Make your next move count.</p>
    </div>
    <select v-model="analyticsId" aria-label="Analyze game ID">
      <option value="">All game IDs</option>
      <option v-for="a in accounts" :key="a.ID" :value="a.ID">{{ a.LABEL }}</option>
    </select>
  </div>
  <div class="stat-grid analytics-stats">
    <article class="stat-card">
      <div><span>Squad assignments</span><Icon name="users" /></div>
      <strong>{{ stats.ASSIGNMENTS || 0 }}</strong>
      <p>Player slots across selected squads</p>
    </article>
    <article class="stat-card">
      <div><span>Average rating</span><Icon name="chart" /></div>
      <strong>{{ stats.AVG_RATING ?? '—' }}</strong>
      <p>Out of a maximum 120</p>
    </article>
    <article class="stat-card">
      <div><span>Highest rating</span><Icon name="star" /></div>
      <strong>{{ stats.BEST_RATING ?? '—' }}</strong>
      <p>The current squad benchmark</p>
    </article>
    <article class="stat-card">
      <div><span>Database countries</span><Icon name="globe" /></div>
      <strong>{{ stats.COUNTRIES || 0 }}</strong>
      <p>Across your entire player database</p>
    </article>
  </div>
  <div class="overview-grid">
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h3>Squad balance</h3>
          <p>Where your players line up.</p>
        </div>
        <Icon name="chart" />
      </div>
      <div class="balance-chart">
        <div
          v-for="p in ['Attack', 'Midfield', 'Defender', 'Goalkeeper']"
          :key="p"
          class="balance-row"
        >
          <div>
            <span><i :class="roleClass(p)"></i>{{ p }}</span
            ><strong
              >{{ stats.positions.find((r) => r.POSITION === p)?.TOTAL || 0
              }}<small> players</small></strong
            >
          </div>
          <div class="bar-track">
            <span
              :class="roleClass(p)"
              :style="{
                width: `${((stats.positions.find((r) => r.POSITION === p)?.TOTAL || 0) / Math.max(1, stats.ASSIGNMENTS)) * 100}%`,
              }"
            ></span>
          </div>
          <small
            >{{ stats.positions.find((r) => r.POSITION === p)?.AVG_RATING ?? '—' }} average
            rating</small
          >
        </div>
      </div>
    </section>
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h3>Your highest rated</h3>
          <p>Every rating belongs to a specific game ID.</p>
        </div>
        <Icon name="star" />
      </div>
      <div v-for="(p, i) in stats.topPlayers" :key="`${p.PLAYER_ID}-${i}`" class="top-player-row">
        <span class="rank">0{{ i + 1 }}</span
        ><span class="player-avatar" :class="roleClass(p.POSITION)">{{ initials(p.NAME) }}</span
        ><span class="account-info"
          ><strong>{{ p.NAME }}</strong
          ><small>{{ p.POSITION_CODE }}<span>·</span>{{ p.LABEL }}</small></span
        ><span class="rating-badge">{{ p.RATING }}</span>
      </div>
      <div v-if="!stats.topPlayers.length" class="empty">
        <p>No ratings yet. Assign your first player to get started.</p>
      </div>
    </section>
  </div>
  <section class="panel compare-panel">
    <div class="panel-heading">
      <div>
        <h3>Game ID comparison</h3>
        <p>Compare the current strength of every squad.</p>
      </div>
    </div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>GAME ID</th>
            <th>PLATFORM</th>
            <th>PLAYERS</th>
            <th>AVERAGE RATING</th>
            <th>BEST RATING</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in accounts" :key="a.ID">
            <td>
              <strong>{{ a.LABEL }}</strong
              ><small class="cell-secondary">{{ a.GAME_ID }}</small>
            </td>
            <td>{{ a.PLATFORM }}</td>
            <td>{{ a.PLAYER_COUNT }}</td>
            <td>
              <span class="rating-badge subtle">{{ a.AVG_RATING ?? '—' }}</span>
            </td>
            <td>{{ a.BEST_RATING ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="!accounts.length" class="empty"><p>Add game IDs to compare squads.</p></div>
  </section>
</template>
