<script setup>
import Icon from './Icon.vue';
import Modal from './Modal.vue';
import { useWorkspace } from '../composables/useWorkspace.js';
const {
  modal,
  closeModal,
  form,
  suggestCode,
  countries,
  positions,
  formError,
  saving,
  save,
  initials,
  roleClass,
  assignQuery,
  scheduleAssign,
  assignOptions,
  accounts,
  selectedAccount,
  history,
  formatDate,
} = useWorkspace();
</script>

<template>
  <Modal v-if="modal" :title="modal.title" :wide="modal.type === 'player'" @close="closeModal">
    <form v-if="modal.type === 'player'" class="modal-form" @submit.prevent="save">
      <p class="form-intro">A single master profile, ready for any of your game IDs.</p>
      <div class="form-grid">
        <label
          >Display name <span>*</span
          ><input
            v-model="form.NAME"
            required
            maxlength="100"
            @blur="suggestCode"
            placeholder="e.g. Erling Haaland" /></label
        ><label
          >Player code <span>*</span
          ><input
            v-model="form.PLAYER_CODE"
            required
            pattern="[a-z0-9-]+"
            maxlength="100"
            placeholder="e.g. erling-haaland"
          /><small>A unique code using lowercase letters, numbers and hyphens.</small></label
        ><label>First name<input v-model="form.FIRST_NAME" maxlength="100" /></label
        ><label>Last name<input v-model="form.LAST_NAME" maxlength="100" /></label
        ><label
          >Country<input v-model="form.COUNTRY" maxlength="100" list="country-options" /><datalist
            id="country-options"
          >
            <option v-for="c in countries" :key="c" :value="c" /></datalist></label
        ><label
          >Date of birth<input
            v-model="form.DOB"
            type="date"
            :max="new Date().toISOString().slice(0, 10)" /></label
        ><label
          >Position group <span>*</span
          ><select v-model="form.POSITION" required>
            <option>Attack</option>
            <option>Midfield</option>
            <option>Defender</option>
            <option>Goalkeeper</option>
          </select></label
        ><label
          >Position code <span>*</span
          ><select v-model="form.POSITION_CODE" required>
            <option v-for="p in positions" :key="p">{{ p }}</option>
          </select></label
        ><label
          >Sub-position<input
            v-model="form.SUB_POSITION"
            maxlength="100"
            placeholder="e.g. Centre-Forward" /></label
        ><label
          >Other positions<input
            v-model="form.POSITIONS"
            maxlength="100"
            placeholder="e.g. SS, LWF" /></label
        ><label
          >Preferred foot<select v-model="form.FOOT">
            <option value="">Not specified</option>
            <option value="left">Left</option>
            <option value="right">Right</option>
            <option value="both">Both</option>
          </select></label
        ><label
          >Height (cm)<input
            v-model="form.HEIGHT_CM"
            type="number"
            min="100"
            max="250"
            placeholder="e.g. 195"
        /></label>
      </div>
      <div v-if="formError" class="alert" role="alert">{{ formError }}</div>
      <div class="modal-footer">
        <button type="button" class="button secondary" :disabled="saving" @click="closeModal">
          Cancel</button
        ><button class="button primary" :disabled="saving">
          {{ saving ? 'Saving…' : 'Save player' }}<Icon name="check" :size="17" />
        </button>
      </div>
    </form>
    <form v-else-if="modal.type === 'account'" class="modal-form" @submit.prevent="save">
      <p class="form-intro">Connect your game ID to a squad. No game password needed.</p>
      <label
        >Squad name <span>*</span
        ><input
          v-model="form.LABEL"
          required
          maxlength="100"
          placeholder="e.g. Main squad" /></label
      ><label
        >Game ID <span>*</span
        ><input
          v-model="form.GAME_ID"
          required
          maxlength="100"
          placeholder="Your in-game account ID" /></label
      ><label
        >Platform<select v-model="form.PLATFORM">
          <option>Mobile</option>
          <option>PC</option>
          <option>PlayStation</option>
          <option>Xbox</option>
        </select></label
      ><label
        >Notes<textarea
          v-model="form.NOTES"
          maxlength="500"
          rows="3"
          placeholder="A little about this squad…"
        ></textarea>
      </label>
      <div v-if="formError" class="alert" role="alert">{{ formError }}</div>
      <div class="modal-footer">
        <button type="button" class="button secondary" :disabled="saving" @click="closeModal">
          Cancel</button
        ><button class="button primary" :disabled="saving">
          {{ saving ? 'Saving…' : 'Save game ID' }}
        </button>
      </div>
    </form>
    <form v-else-if="modal.type === 'assign'" class="modal-form" @submit.prevent="save">
      <p class="form-intro">Assign a player and declare their rating for this game ID.</p>
      <div v-if="modal.player" class="selected-player">
        <span class="player-avatar large" :class="roleClass(modal.player.POSITION)">{{
          initials(modal.player.NAME)
        }}</span>
        <div>
          <strong>{{ modal.player.NAME }}</strong
          ><small>{{ modal.player.COUNTRY }} · {{ modal.player.POSITION_CODE }}</small>
        </div>
      </div>
      <template v-else
        ><label
          >Find a player<input
            v-model="assignQuery"
            placeholder="Search by name…"
            @input="scheduleAssign" /></label
        ><label
          >Player <span>*</span
          ><select v-model="form.PLAYER_ID" required>
            <option value="" disabled>Select a player</option>
            <option v-for="p in assignOptions" :key="p.PLAYER_ID" :value="p.PLAYER_ID">
              {{ p.NAME }} · {{ p.POSITION_CODE }}
            </option></select
          ><small>Up to 100 matches. Type a name to narrow the list.</small></label
        ></template
      ><label
        >Game ID <span>*</span
        ><select v-model="form.GAME_ACCOUNT_ID" required>
          <option v-for="a in accounts" :key="a.ID" :value="a.ID">
            {{ a.LABEL }} · {{ a.GAME_ID }}
          </option>
        </select></label
      ><label
        >Player rating <span>*</span
        ><input v-model="form.RATING" type="number" min="1" max="120" step="1" required /><small
          >1–120. This rating applies only to the selected game ID.</small
        ></label
      >
      <div v-if="formError" class="alert" role="alert">{{ formError }}</div>
      <div class="modal-footer">
        <button type="button" class="button secondary" :disabled="saving" @click="closeModal">
          Cancel</button
        ><button class="button primary" :disabled="saving">
          {{ saving ? 'Assigning…' : 'Assign to squad' }}<Icon name="plus" :size="17" />
        </button>
      </div>
    </form>
    <form v-else-if="modal.type === 'rating'" class="modal-form" @submit.prevent="save">
      <div class="selected-player">
        <span class="player-avatar large" :class="roleClass(modal.player.POSITION)">{{
          initials(modal.player.NAME)
        }}</span>
        <div>
          <strong>{{ modal.player.NAME }}</strong
          ><small>{{ selectedAccount?.LABEL }} · Current rating {{ modal.player.RATING }}</small>
        </div>
      </div>
      <label
        >New rating <span>*</span
        ><input v-model="form.RATING" type="number" min="1" max="120" step="1" required /><small
          >Enter a whole number from 1 to 120. Changes are recorded automatically.</small
        ></label
      >
      <div v-if="formError" class="alert" role="alert">{{ formError }}</div>
      <div class="modal-footer">
        <button type="button" class="button secondary" :disabled="saving" @click="closeModal">
          Cancel</button
        ><button class="button primary" :disabled="saving">
          {{ saving ? 'Saving…' : 'Declare rating' }}
        </button>
      </div>
    </form>
    <div v-else-if="modal.type === 'history'" class="modal-form">
      <div class="selected-player">
        <span class="player-avatar large" :class="roleClass(modal.player.POSITION)">{{
          initials(modal.player.NAME)
        }}</span>
        <div>
          <strong>{{ modal.player.NAME }}</strong
          ><small>{{ selectedAccount?.LABEL }} · Latest 100 changes</small>
        </div>
      </div>
      <div v-if="formError" class="alert" role="alert">{{ formError }}</div>
      <div v-for="h in history" :key="h.ID" class="history-item">
        <span class="old-rating">{{ h.OLD_RATING ?? 'New' }}</span
        ><Icon name="arrow" :size="16" /><span class="rating-badge">{{ h.NEW_RATING }}</span>
        <div>
          <strong>{{ h.CHANGED_BY_NAME }}</strong
          ><small>{{ formatDate(h.CHANGED_AT) }}</small>
        </div>
      </div>
      <p v-if="!history.length && !formError" class="muted">No rating changes to show.</p>
    </div>
    <form v-else-if="modal.type === 'delete'" class="modal-form" @submit.prevent="save">
      <p class="delete-copy">
        <strong>{{ modal.record.NAME || modal.record.LABEL }}</strong
        ><br />{{
          modal.kind === 'accounts'
            ? 'This removes the game ID, its assignments and all associated rating history.'
            : modal.kind === 'assignments'
              ? 'This removes the player from this squad and deletes their rating history for this assignment.'
              : 'This permanently deletes the player profile. Players assigned to a squad must be removed from their squads first.'
        }}
      </p>
      <div v-if="formError" class="alert" role="alert">{{ formError }}</div>
      <div class="modal-footer">
        <button type="button" class="button secondary" :disabled="saving" @click="closeModal">
          Cancel</button
        ><button class="button danger" :disabled="saving">
          {{ saving ? 'Removing…' : 'Confirm removal' }}
        </button>
      </div>
    </form>
  </Modal>
</template>
