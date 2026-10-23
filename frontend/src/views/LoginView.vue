<script setup>
import { ref } from 'vue';
import Icon from '../components/Icon.vue';
import { useWorkspace } from '../composables/useWorkspace.js';
const { login, loginBusy, error, signIn } = useWorkspace();
const showPassword = ref(false);
</script>
<template>
  <div class="login-layout">
    <section class="login-story">
      <a class="brand" href="#"
        ><span class="brand-mark"><Icon name="football" :size="28" /></span
        ><span class="brand-name">touchline<span class="brand-dot">.</span></span></a
      >
      <div class="login-story-copy">
        <span class="hero-tag"><span></span>YOUR PERSONAL FOOTBALL HQ</span>
        <h1>Your club.<br /><em>Your rules.</em></h1>
        <p>One place for every player, every squad and every step forward.</p>
        <div class="login-features">
          <span><Icon name="users" :size="17" />Your players</span
          ><span><Icon name="game" :size="17" />Your squads</span
          ><span><Icon name="chart" :size="17" />Your insights</span>
        </div>
      </div>
      <div class="login-field-art" aria-hidden="true">
        <div class="login-field-circle"></div>
        <div class="login-field-box"></div>
        <Icon name="football" :size="120" />
      </div>
      <div class="login-story-footer">
        <span class="status-dot"></span>Built for the love of the game.
      </div>
    </section>
    <main class="login-panel">
      <div class="login-form-wrap">
        <span class="login-symbol"><Icon name="shield" :size="25" /></span
        ><span class="eyebrow">BACK IN THE GAME</span>
        <h2>Welcome to your club.</h2>
        <p class="muted">Sign in and pick up where you left off.</p>
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
            >Password<span class="password-field"
              ><input
                v-model="login.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                required
                maxlength="256"
                placeholder="Enter your password" /><button
                type="button"
                class="icon-button"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                :aria-pressed="showPassword"
                @click="showPassword = !showPassword"
              >
                <Icon :name="showPassword ? 'eyeOff' : 'eye'" :size="19" /></button></span
          ></label>
          <div v-if="error" class="alert" role="alert">{{ error }}</div>
          <button class="button primary" :disabled="loginBusy">
            {{ loginBusy ? 'Signing you in…' : 'Enter your workspace'
            }}<Icon name="arrow" :size="19" />
          </button>
        </form>
        <p class="login-note">
          <Icon name="shield" :size="15" />Private workspace. Administrator access.
        </p>
      </div>
      <span class="login-copyright">TOUCHLINE / EFOOTBALL MANAGER</span>
    </main>
  </div>
</template>
