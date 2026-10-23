<script setup>
import { ref, watch } from 'vue';
import Icon from './components/Icon.vue';
import WorkspaceDialogs from './components/WorkspaceDialogs.vue';
import { provideWorkspace } from './composables/useWorkspace.js';
import { useNavigationDrawer } from './composables/useNavigationDrawer.js';
import DashboardView from './views/DashboardView.vue';
import PlayersView from './views/PlayersView.vue';
import GamesView from './views/GamesView.vue';
import AnalyticsView from './views/AnalyticsView.vue';
import HistoryView from './views/HistoryView.vue';
import LoginView from './views/LoginView.vue';
import SettingsView from './views/SettingsView.vue';
const {
  nav,
  page,
  mobileNav,
  user,
  booting,
  loading,
  error,
  toast,
  stats,
  pageTitle,
  initials,
  navigate,
  signOut,
  guarded,
  refresh,
  isDemo,
  query,
  openPlayer,
  canManageDatabase,
} = provideWorkspace();
const headerSearch = ref('');
const { drawer, menuButton, onKeydown } = useNavigationDrawer(mobileNav);
watch(user, (value) => {
  if (!value) mobileNav.value = false;
});
function searchPlayers() {
  query.value = headerSearch.value.trim();
  navigate('players');
}
</script>

<template>
  <a v-if="user" class="skip-link" href="#main-content">Skip to content</a>
  <div v-if="booting" class="boot">
    <span class="brand-mark"><Icon name="football" :size="34" /></span>
    <p>Getting your workspace ready…</p>
  </div>
  <LoginView v-else-if="!user" />
  <div v-else class="app-shell">
    <div v-if="mobileNav" class="sidebar-scrim" @click="mobileNav = false"></div>
    <aside ref="drawer" class="sidebar" :class="{ open: mobileNav }" @keydown="onKeydown">
      <div class="sidebar-brand-row">
        <a
          class="brand"
          href="#dashboard"
          aria-label="Touchline overview"
          @click="navigate('dashboard')"
          ><span class="brand-mark"><Icon name="football" :size="26" /></span
          ><span class="brand-name">touchline<span class="brand-dot">.</span></span></a
        >
        <button
          class="icon-button drawer-close"
          aria-label="Close navigation"
          @click="mobileNav = false"
        >
          <Icon name="close" />
        </button>
      </div>
      <div class="workspace-label"><span class="status-dot"></span>EFOOTBALL WORKSPACE</div>
      <div class="nav-caption">YOUR CLUB</div>
      <nav aria-label="Main navigation">
        <a
          v-for="n in nav"
          :key="n.id"
          :href="`#${n.id}`"
          :class="{ active: page === n.id }"
          :aria-current="page === n.id ? 'page' : undefined"
          :aria-label="n.name"
          :title="n.name"
          @click.prevent="navigate(n.id)"
          ><Icon :name="n.icon" /><span class="nav-label">{{ n.name }}</span
          ><span v-if="n.id === 'players'" class="nav-count">{{
            Number(stats.PLAYERS || 0).toLocaleString()
          }}</span
          ><span v-if="page === n.id" class="nav-active-dot"></span
        ></a>
      </nav>
      <div class="sidebar-bottom">
        <div class="sidebar-tip">
          <span class="tip-icon"><Icon name="target" :size="24" /></span
          ><span class="eyebrow">MAKE YOUR NEXT MOVE</span>
          <h4>A stronger squad<br />starts with insight.</h4>
          <button @click="navigate('analytics')">
            Explore analytics<Icon name="arrow" :size="17" />
          </button>
        </div>
        <div class="profile">
          <span class="avatar">{{ initials(user.NAME) }}</span>
          <div>
            <strong>{{ user.NAME }}</strong
            ><small>{{
              isDemo
                ? 'Demo manager'
                : user.ROLE === 'super_admin'
                  ? 'Super administrator'
                  : user.ROLE === 'admin'
                    ? 'Administrator'
                    : 'Squad manager'
            }}</small>
          </div>
          <button
            v-if="!isDemo"
            class="icon-button"
            title="Sign out"
            aria-label="Sign out"
            @click="signOut"
          >
            <Icon name="logout" :size="18" /></button
          ><Icon v-else name="shield" :size="17" />
        </div>
      </div>
    </aside>
    <div class="main-shell">
      <header class="topbar">
        <div class="breadcrumb">
          <button
            ref="menuButton"
            class="icon-button mobile-menu"
            aria-label="Open navigation"
            :aria-expanded="mobileNav"
            @click="mobileNav = true"
          >
            <Icon name="menu" /></button
          ><span>Workspace</span><Icon name="chevron" :size="13" /><strong>{{ pageTitle }}</strong>
        </div>
        <form class="topbar-search" role="search" @submit.prevent="searchPlayers">
          <Icon name="search" :size="17" /><input
            v-model="headerSearch"
            class="search-input"
            aria-label="Search the player database"
            placeholder="Find your next player…"
            maxlength="100"
          /><span aria-hidden="true">↵</span>
        </form>
        <div class="topbar-right">
          <span v-if="isDemo" class="demo-pill">DEMO</span
          ><span class="workspace-status"><span class="status-dot"></span>Private club</span
          ><button
            class="icon-button mobile-search"
            aria-label="Find a player"
            @click="navigate('players')"
          >
            <Icon name="search" /></button
          ><button
            v-if="canManageDatabase"
            class="icon-button quick-add"
            aria-label="Add a new player"
            title="Add player"
            @click="openPlayer()"
          >
            <Icon name="plus" /></button
          ><button
            class="avatar small"
            aria-label="Account settings"
            title="Account settings"
            @click="navigate('settings')"
          >
            {{ initials(user.NAME) }}
          </button>
        </div>
        <div
          v-if="loading"
          class="loading-line"
          role="progressbar"
          aria-label="Updating workspace"
        ></div>
      </header>
      <main id="main-content" class="main-content" tabindex="-1" :aria-busy="loading">
        <div v-if="isDemo" class="demo-notice">
          <Icon name="info" :size="16" /><span
            >Demo workspace. Sample squads and ratings are saved in this browser.</span
          >
        </div>
        <div v-if="error" class="alert page-alert" role="alert">
          {{ error
          }}<button class="text-button" @click="guarded(refresh)">
            Try again<Icon name="arrow" :size="16" />
          </button>
        </div>
        <DashboardView v-if="page === 'dashboard'" /><PlayersView
          v-if="page === 'players'"
        /><GamesView v-if="page === 'games'" /><AnalyticsView
          v-if="page === 'analytics'"
        /><HistoryView v-if="page === 'history'" />
        <SettingsView v-if="page === 'settings'" />
        <footer class="main-footer">
          <span
            ><Icon name="football" :size="16" /><strong>touchline.</strong
            ><span class="footer-separator">/</span>Your club. Your next chapter.</span
          ><span>Built around your game.</span>
        </footer>
      </main>
    </div>
    <nav class="mobile-bottom-nav" aria-label="Quick navigation">
      <a
        v-for="n in nav"
        :key="n.id"
        :href="`#${n.id}`"
        :class="{ active: page === n.id }"
        :aria-current="page === n.id ? 'page' : undefined"
        @click.prevent="navigate(n.id)"
        ><Icon :name="n.icon" :size="21" /><span>{{ n.shortName }}</span></a
      >
    </nav>
  </div>
  <Transition name="toast"
    ><div v-if="toast" class="toast-message" role="status">
      <span><Icon name="check" :size="18" /></span>{{ toast }}
    </div></Transition
  >
  <WorkspaceDialogs />
</template>
