<script setup>
import Icon from '../components/Icon.vue';
import { useWorkspace } from '../composables/useWorkspace.js';
const {
  stats,
  accounts,
  players,
  initials,
  roleClass,
  openPlayer,
  openAccount,
  accountId,
  navigate,
  canManageDatabase,
  openAssign,
} = useWorkspace();
</script>

<template>
  <div class="page-heading">
    <div>
      <span class="eyebrow">YOUR CLUB, CONNECTED</span>
      <h1>Welcome to the touchline<span class="accent-text">.</span></h1>
      <p>Your collection. Your squads. A clear view of the whole game.</p>
    </div>
    <button v-if="canManageDatabase" class="button primary" @click="openPlayer()">
      <Icon name="plus" :size="18" />Add player
    </button>
  </div>
  <section class="hero-card">
    <div class="hero-copy">
      <span class="hero-tag"><span></span>YOUR PERSONAL FOOTBALL HQ</span>
      <h2>Build your<br /><em>next great squad.</em></h2>
      <p>Discover the right players, bring your game IDs together and make every position count.</p>
      <div class="hero-actions">
        <button class="button primary hero-cta" @click="navigate('players')">
          Explore players<Icon name="arrow" :size="18" /></button
        ><button class="button secondary" @click="openAccount()">
          <Icon name="plus" :size="17" />Create game ID
        </button>
      </div>
      <div class="hero-footer">
        <Icon name="shield" :size="14" />Your players and ratings, in one private workspace.
      </div>
    </div>
    <div class="pitch-art" aria-hidden="true">
      <div class="pitch-lines">
        <div class="half-line"></div>
        <div class="center-circle"></div>
        <div class="penalty top"></div>
        <div class="penalty bottom"></div>
        <div class="goal top"></div>
        <div class="goal bottom"></div>
        <span class="pitch-player p1">CF</span><span class="pitch-player p2">LWF</span
        ><span class="pitch-player p3">RWF</span><span class="pitch-player p4">AMF</span
        ><span class="pitch-player p5">CMF</span><span class="pitch-player p6">DMF</span
        ><span class="pitch-player p7">CB</span><span class="pitch-player p8">CB</span
        ><span class="pitch-player p9">LB</span><span class="pitch-player p10">RB</span
        ><span class="pitch-player p11">GK</span>
      </div>
      <div class="formation-label">
        <span>YOUR NEXT STARTING ELEVEN</span><strong>One squad. Endless possibilities.</strong>
      </div>
    </div>
    <span class="hero-number">TOUCHLINE / THE CLUBHOUSE</span>
  </section>
  <div class="stat-grid">
    <article class="stat-card">
      <div>
        <span>Total players</span><span class="stat-icon indigo-icon"><Icon name="users" /></span>
      </div>
      <strong>{{ stats.PLAYERS == null ? '—' : Number(stats.PLAYERS).toLocaleString() }}</strong>
      <p><span class="tiny-dot"></span>In your master database</p>
    </article>
    <article class="stat-card">
      <div>
        <span>Game IDs</span><span class="stat-icon purple-icon"><Icon name="game" /></span>
      </div>
      <strong>{{ stats.ACCOUNTS ?? '—' }}</strong>
      <p>One workspace. Every account.</p>
    </article>
    <article class="stat-card">
      <div>
        <span>Assigned players</span
        ><span class="stat-icon orange-icon"><Icon name="shield" /></span>
      </div>
      <strong>{{
        stats.ASSIGNMENTS == null ? '—' : Number(stats.ASSIGNMENTS).toLocaleString()
      }}</strong>
      <p>Across all your squads</p>
    </article>
    <article class="stat-card">
      <div>
        <span>Average rating</span><span class="stat-icon blue-icon"><Icon name="chart" /></span>
      </div>
      <strong>{{ stats.AVG_RATING ?? '—' }}<small v-if="stats.AVG_RATING">/ 120</small></strong>
      <p>Every assignment, weighted equally</p>
    </article>
  </div>
  <div class="overview-grid">
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h3>
            Your game IDs <span class="count-badge">{{ accounts.length }}</span>
          </h3>
          <p>A home for every squad.</p>
        </div>
        <button class="text-button" @click="navigate('games')">
          View all<Icon name="arrow" :size="16" />
        </button>
      </div>
      <div v-if="!accounts.length" class="empty">
        <Icon name="game" :size="32" />
        <h3>Your first squad starts here.</h3>
        <p>Add a game ID, then assign your players.</p>
        <button class="button secondary" @click="openAccount()">Add game ID</button>
      </div>
      <button
        v-for="(a, i) in accounts.slice(0, 3)"
        :key="a.ID"
        class="account-row"
        @click="
          accountId = a.ID;
          navigate('games');
        "
      >
        <span class="account-emblem" :class="`emblem-${i % 3}`"
          ><Icon :name="i === 2 ? 'star' : 'shield'" :size="23" /></span
        ><span class="account-info"
          ><strong>{{ a.LABEL }}</strong
          ><small>{{ a.PLATFORM }}<span>·</span>{{ a.GAME_ID }}</small></span
        ><span class="account-meta"
          ><strong>{{ a.PLAYER_COUNT }} <small>players</small></strong
          ><small>{{ a.AVG_RATING ?? '—' }} avg. rating</small></span
        ><Icon name="chevron" :size="16" /></button
      ><button class="add-account-row" @click="openAccount()">
        <Icon name="plus" :size="17" /> Add another game ID
      </button>
    </section>
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h3>Top of the squad</h3>
          <p>The highest rated across your game IDs.</p>
        </div>
        <span class="subtle-icon"><Icon name="star" :size="19" /></span>
      </div>
      <div v-if="!stats.topPlayers.length" class="empty compact">
        <Icon name="star" :size="32" />
        <p>Assign players and declare ratings to see your leaders.</p>
      </div>
      <div
        v-for="(p, i) in stats.topPlayers.slice(0, 4)"
        :key="`${p.PLAYER_ID}-${i}`"
        class="top-player-row"
      >
        <span class="rank">0{{ i + 1 }}</span
        ><span class="player-avatar" :class="roleClass(p.POSITION)">{{ initials(p.NAME) }}</span
        ><span class="account-info"
          ><strong>{{ p.NAME }}</strong
          ><small>{{ p.POSITION_CODE }}<span>·</span>{{ p.LABEL }}</small></span
        ><span class="rating-badge">{{ p.RATING }}</span>
      </div>
    </section>
  </div>
  <section class="panel database-preview">
    <div class="panel-heading">
      <div>
        <h3>A world of players</h3>
        <p>{{ stats.COUNTRIES || 0 }} countries. One database. Find your next difference-maker.</p>
      </div>
      <button class="text-button" @click="navigate('players')">
        Open database<Icon name="arrow" :size="16" />
      </button>
    </div>
    <div class="preview-players">
      <button
        v-for="p in players.slice(0, 5)"
        :key="p.PLAYER_ID"
        @click="canManageDatabase ? openPlayer(p) : openAssign(p)"
      >
        <span class="player-avatar large" :class="roleClass(p.POSITION)">{{
          initials(p.NAME)
        }}</span
        ><strong>{{ p.NAME }}</strong
        ><small>{{ p.COUNTRY }} <span>·</span> {{ p.POSITION_CODE }}</small>
      </button>
    </div>
  </section>
</template>
