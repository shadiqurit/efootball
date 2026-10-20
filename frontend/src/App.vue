<script setup>
import Icon from './components/Icon.vue';
import WorkspaceDialogs from './components/WorkspaceDialogs.vue';
import { provideWorkspace } from './composables/useWorkspace.js';
import DashboardView from './views/DashboardView.vue';
import PlayersView from './views/PlayersView.vue';
import GamesView from './views/GamesView.vue';
import AnalyticsView from './views/AnalyticsView.vue';
import HistoryView from './views/HistoryView.vue';
import LoginView from './views/LoginView.vue';
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
} = provideWorkspace();
</script>

<template>
  <div v-if="booting" class="boot">
    <Icon name="football" :size="40" />
    <p>Opening your workspace…</p>
  </div>
  <LoginView v-else-if="!user" />
  <div v-else class="app-shell">
    <div v-if="mobileNav" class="sidebar-scrim" @click="mobileNav = false"></div>
    <aside class="sidebar" :class="{ open: mobileNav }">
      <a class="brand" href="#dashboard" @click="navigate('dashboard')"
        ><span class="brand-mark"><Icon name="football" :size="25" /></span>touchline<span
          class="brand-dot"
          >.</span
        ></a
      >
      <div class="workspace-label">EFOOTBALL MANAGER <span>v1.0</span></div>
      <div class="nav-caption">WORKSPACE</div>
      <nav>
        <a
          v-for="n in nav"
          :key="n.id"
          :href="`#${n.id}`"
          :class="{ active: page === n.id }"
          :aria-current="page === n.id ? 'page' : undefined"
          @click.prevent="navigate(n.id)"
          ><Icon :name="n.icon" /><span>{{ n.name }}</span
          ><span v-if="n.id === 'players'" class="nav-count">{{ stats.PLAYERS || 0 }}</span></a
        >
      </nav>
      <div class="sidebar-bottom">
        <div class="sidebar-tip">
          <span class="tip-icon"><Icon name="football" :size="23" /></span>
          <h4>A better view of your game.</h4>
          <p>Build your squads.<br />Know your players.</p>
          <button @click="navigate('analytics')">
            Explore analytics <Icon name="arrow" :size="17" />
          </button>
        </div>
        <div class="profile">
          <span class="avatar">{{ initials(user.NAME) }}</span>
          <div>
            <strong>{{ user.NAME }}</strong
            ><small>{{ isDemo ? 'Preview workspace' : 'Administrator' }}</small>
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
            class="icon-button mobile-menu"
            aria-label="Open navigation"
            @click="mobileNav = true"
          >
            <Icon name="menu" /></button
          ><span>Workspace</span><Icon name="chevron" :size="13" /><strong>{{ pageTitle }}</strong>
        </div>
        <div class="topbar-right">
          <span v-if="isDemo" class="demo-pill">LOCAL DEMO</span><span class="status-dot"></span
          ><span>{{ isDemo ? 'Browser storage' : 'Private workspace' }}</span
          ><span class="topbar-divider"></span
          ><span class="avatar small">{{ initials(user.NAME) }}</span>
        </div>
      </header>
      <main class="main-content" :aria-busy="loading">
        <div v-if="isDemo" class="demo-notice">
          <Icon name="info" :size="15" />Demo workspace · Player data comes from your files. Sample
          game IDs and ratings are saved in this browser.
        </div>
        <div v-if="error" class="alert page-alert" role="alert">
          {{ error }}<button @click="guarded(refresh)" class="text-button">Retry</button>
        </div>
        <DashboardView v-if="page === 'dashboard'" />

        <PlayersView v-if="page === 'players'" />

        <GamesView v-if="page === 'games'" />

        <AnalyticsView v-if="page === 'analytics'" />

        <HistoryView v-if="page === 'history'" />

        <footer class="main-footer">
          <span
            ><Icon name="football" :size="15" />touchline.
            <span class="footer-separator">/</span> Built around your game.</span
          ><span>Your collection. Your decisions.</span>
        </footer>
      </main>
    </div>
  </div>
  <Transition name="toast"
    ><div v-if="toast" class="toast-message" role="status">
      <span><Icon name="check" :size="17" /></span>{{ toast }}
    </div></Transition
  >

  <WorkspaceDialogs />
</template>
