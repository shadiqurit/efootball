<script setup>
import Icon from '../components/Icon.vue';
import { useWorkspace } from '../composables/useWorkspace.js';
const { navigate, stats, formatDate } = useWorkspace();
</script>

<template>
  <div class="page-heading">
    <div>
      <span class="eyebrow">EVERY CHANGE TELLS A STORY</span>
      <h1>Rating history<span class="green">.</span></h1>
      <p>
        The latest 8 rating changes across your squads. Open a squad player’s history for up to 100
        changes.
      </p>
    </div>
    <button class="button secondary" @click="navigate('games')">
      View squads<Icon name="arrow" :size="17" />
    </button>
  </div>
  <section class="panel">
    <div class="panel-heading">
      <div>
        <h3>Recent declarations</h3>
        <p>Initial ratings and every update, recorded automatically.</p>
      </div>
      <Icon name="history" />
    </div>
    <div v-for="h in stats.activity" :key="h.ID" class="activity-row">
      <span class="activity-icon"><Icon :name="h.OLD_RATING ? 'chart' : 'plus'" :size="20" /></span>
      <div class="account-info">
        <strong>{{ h.NAME }}</strong
        ><small>{{ h.LABEL }}<span>·</span>{{ formatDate(h.CHANGED_AT) }}</small>
      </div>
      <span class="old-rating">{{ h.OLD_RATING ?? 'New' }}</span
      ><Icon name="arrow" :size="17" /><span class="rating-badge">{{ h.NEW_RATING }}</span>
    </div>
    <div v-if="!stats.activity.length" class="empty">
      <Icon name="history" :size="36" />
      <h3>The story is just beginning.</h3>
      <p>Declare your first player rating to start a history.</p>
    </div>
  </section>
</template>
