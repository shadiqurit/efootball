<script setup>
import Icon from '../components/Icon.vue';
import { useWorkspace } from '../composables/useWorkspace.js';
const { login, loginBusy, error, signIn } = useWorkspace();
</script>

<template>
  <div class="login-layout">
    <div class="login-story">
      <a class="brand" href="#"
        ><span class="brand-mark"><Icon name="football" :size="25" /></span>touchline<span
          class="brand-dot"
          >.</span
        ></a
      >
      <div>
        <span class="eyebrow">YOUR GAME. YOUR WORKSPACE.</span>
        <h1>Great squads<br />start here.</h1>
        <p>One home for your players, game IDs, and every rating that matters.</p>
        <div class="login-pitch"><Icon name="football" :size="88" /></div>
      </div>
      <span>Built for the way you play eFootball.</span>
    </div>
    <main class="login-panel">
      <div>
        <span class="eyebrow">WELCOME BACK</span>
        <h2>Back to the touchline.</h2>
        <p class="muted">Sign in to manage your football universe.</p>
        <form @submit.prevent="signIn">
          <label
            >Email address<input
              v-model="login.email"
              type="email"
              autocomplete="username"
              required
              placeholder="you@example.com"
              maxlength="254" /></label
          ><label
            >Password<input
              v-model="login.password"
              type="password"
              autocomplete="current-password"
              required
              maxlength="256"
              placeholder="Enter your password"
          /></label>
          <div v-if="error" class="alert" role="alert">{{ error }}</div>
          <button class="button primary" :disabled="loginBusy">
            {{ loginBusy ? 'Signing in…' : 'Sign in to workspace' }}<Icon name="arrow" />
          </button>
        </form>
        <p class="login-note">
          <Icon name="shield" :size="16" />Private workspace · Administrator access
        </p>
      </div>
    </main>
  </div>
</template>
