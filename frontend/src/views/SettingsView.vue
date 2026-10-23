<script setup>
import { ref, watch, onMounted } from 'vue';
import { api } from '../api.js';
import { useWorkspace } from '../composables/useWorkspace.js';
import Modal from '../components/Modal.vue';
import Icon from '../components/Icon.vue';

const { user, isSuperAdmin, isDemo, notify, accounts, refresh } = useWorkspace();
const squadOwners = ref({});
watch(
  accounts,
  (value) => {
    squadOwners.value = Object.fromEntries(value.map((a) => [a.ID, a.OWNER_ID]));
  },
  { immediate: true },
);
const roles = [
  { value: 'user', label: 'User', detail: 'Manage own squads and add players to them.' },
  {
    value: 'admin',
    label: 'Administrator',
    detail: 'Also edit the shared player database and playing styles.',
  },
  {
    value: 'super_admin',
    label: 'Super administrator',
    detail: 'Manage all squads, users and permissions.',
  },
];
const roleLabel = (value) => roles.find((r) => r.value === value)?.label || 'User';
const profile = ref({ NAME: '', EMAIL: '', currentPassword: '' });
const password = ref({ currentPassword: '', newPassword: '', confirm: '' });
const users = ref([]),
  busy = ref(false),
  error = ref(''),
  dialog = ref(null),
  form = ref({}),
  dialogError = ref('');
watch(
  user,
  (value) => {
    if (value) profile.value = { NAME: value.NAME, EMAIL: value.EMAIL, currentPassword: '' };
  },
  { immediate: true },
);

async function loadUsers() {
  if (isSuperAdmin.value) users.value = await api('/users');
}
async function perform(action, inDialog = false) {
  if (busy.value) return;
  busy.value = true;
  const target = inDialog ? dialogError : error;
  target.value = '';
  try {
    await action();
  } catch (err) {
    if (err.status === 401) user.value = null;
    else target.value = err.message;
  } finally {
    busy.value = false;
  }
}
function updateProfile() {
  return perform(async () => {
    user.value = await api('/auth/profile', 'PATCH', { ...profile.value });
    profile.value.currentPassword = '';
    notify('Account details updated.');
    await loadUsers();
  });
}
function changePassword() {
  return perform(async () => {
    if (password.value.newPassword !== password.value.confirm)
      throw new Error('New passwords do not match.');
    await api('/auth/password', 'PUT', {
      currentPassword: password.value.currentPassword,
      newPassword: password.value.newPassword,
    });
    password.value = { currentPassword: '', newPassword: '', confirm: '' };
    user.value = null;
    notify('Password changed. Sign in again.');
  });
}
function transferSquad(account) {
  return perform(async () => {
    await api(`/accounts/${account.ID}/owner`, 'PATCH', {
      OWNER_ID: Number(squadOwners.value[account.ID]),
    });
    await refresh();
    notify('Squad owner updated.');
  });
}
function openUser(record) {
  dialogError.value = '';
  form.value = record
    ? {
        ID: record.ID,
        NAME: record.NAME,
        EMAIL: record.EMAIL,
        ROLE: record.ROLE,
        IS_ACTIVE: Boolean(record.IS_ACTIVE),
      }
    : { NAME: '', EMAIL: '', ROLE: 'user', IS_ACTIVE: true, PASSWORD: '' };
  dialog.value = 'user';
}
function openReset(record) {
  dialogError.value = '';
  form.value = { ID: record.ID, NAME: record.NAME, password: '', confirm: '' };
  dialog.value = 'reset';
}
function closeDialog() {
  if (!busy.value) {
    dialog.value = null;
    form.value = {};
    dialogError.value = '';
  }
}
function saveUser() {
  return perform(async () => {
    const { ID, ...input } = form.value;
    if (dialog.value === 'reset') {
      if (input.password !== input.confirm) throw new Error('New passwords do not match.');
      await api(`/users/${ID}/password`, 'PUT', { password: input.password });
      if (ID === user.value.ID) user.value = null;
      notify('Password reset. Previous sessions have been signed out.');
    } else {
      await api(`/users${ID ? `/${ID}` : ''}`, ID ? 'PUT' : 'POST', input);
      if (ID === user.value.ID) {
        if (input.ROLE !== user.value.ROLE || !input.IS_ACTIVE) user.value = null;
        else user.value = { ID, NAME: input.NAME, EMAIL: input.EMAIL, ROLE: input.ROLE };
      }
      notify(ID ? 'User updated.' : 'User created.');
    }
    dialog.value = null;
    form.value = {};
    await loadUsers();
  }, true);
}
onMounted(() => perform(loadUsers));
</script>

<template>
  <div class="page-heading">
    <div>
      <span class="eyebrow">YOUR ACCOUNT</span>
      <h1>Account settings<span class="accent-text">.</span></h1>
      <p>Manage your profile, password and access.</p>
    </div>
    <span class="count-badge">{{ isDemo ? 'Demo manager' : roleLabel(user.ROLE) }}</span>
  </div>
  <div v-if="isDemo" class="demo-notice">
    Account and user management are available when signed in to the live application.
  </div>
  <template v-else>
    <div v-if="error" class="alert page-alert" role="alert">{{ error }}</div>
    <div class="settings-grid">
      <section class="panel">
        <div class="panel-heading">
          <div>
            <h3>Profile</h3>
            <p>Your password is required to change your name or email.</p>
          </div>
        </div>
        <form class="modal-form" @submit.prevent="updateProfile">
          <label
            >Name<input v-model="profile.NAME" autocomplete="name" maxlength="100" required
          /></label>
          <label
            >Email<input
              v-model="profile.EMAIL"
              type="email"
              autocomplete="username"
              maxlength="254"
              required
          /></label>
          <label
            >Current password<input
              v-model="profile.currentPassword"
              type="password"
              autocomplete="current-password"
              maxlength="256"
              required
          /></label>
          <div class="modal-footer">
            <button class="button primary" :disabled="busy">
              {{ busy ? 'Please wait…' : 'Save profile' }}
            </button>
          </div>
        </form>
      </section>
      <section class="panel">
        <div class="panel-heading">
          <div>
            <h3>Change password</h3>
            <p>Use at least 12 characters. All devices will be signed out.</p>
          </div>
        </div>
        <form class="modal-form" @submit.prevent="changePassword">
          <label
            >Current password<input
              v-model="password.currentPassword"
              type="password"
              autocomplete="current-password"
              maxlength="256"
              required
          /></label>
          <label
            >New password<input
              v-model="password.newPassword"
              type="password"
              autocomplete="new-password"
              minlength="12"
              maxlength="256"
              required
          /></label>
          <label
            >Confirm new password<input
              v-model="password.confirm"
              type="password"
              autocomplete="new-password"
              minlength="12"
              maxlength="256"
              required
          /></label>
          <div class="modal-footer">
            <button class="button primary" :disabled="busy">Change password</button>
          </div>
        </form>
      </section>
    </div>
    <section v-if="isSuperAdmin" class="panel users-panel">
      <div class="panel-heading">
        <div>
          <h3>Users & permissions</h3>
          <p>
            Create accounts, change roles, disable access or reset passwords. Disabled users keep
            their squads and history.
          </p>
        </div>
        <button class="button primary" :disabled="busy" @click="openUser()">
          <Icon name="plus" :size="17" />Add user
        </button>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th class="align-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in users" :key="record.ID">
              <td data-label="Name">
                {{ record.NAME }}{{ record.ID === user.ID ? ' (you)' : '' }}
              </td>
              <td data-label="Email">{{ record.EMAIL }}</td>
              <td data-label="Role">{{ roleLabel(record.ROLE) }}</td>
              <td data-label="Status">{{ record.IS_ACTIVE ? 'Active' : 'Disabled' }}</td>
              <td data-label="Actions">
                <div class="row-actions">
                  <button class="button secondary" :disabled="busy" @click="openUser(record)">
                    Edit</button
                  ><button class="button secondary" :disabled="busy" @click="openReset(record)">
                    Reset password
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="!users.length" class="empty">
        {{ busy ? 'Loading users…' : 'No users to display.' }}
      </p>
    </section>
    <section v-if="isSuperAdmin && accounts.length" class="panel users-panel">
      <div class="panel-heading">
        <div>
          <h3>Squad ownership</h3>
          <p>
            Assign existing squads to their users. Players and rating history stay with the squad.
          </p>
        </div>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Squad</th>
              <th>Owner</th>
              <th class="align-right">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="account in accounts" :key="account.ID">
              <td data-label="Squad">
                {{ account.LABEL }}<small class="cell-secondary">{{ account.GAME_ID }}</small>
              </td>
              <td data-label="Owner">
                <select v-model="squadOwners[account.ID]" :aria-label="`Owner of ${account.LABEL}`">
                  <option
                    v-for="record in users"
                    :key="record.ID"
                    :value="record.ID"
                    :disabled="!record.IS_ACTIVE"
                  >
                    {{ record.NAME }} ({{ record.EMAIL }}){{
                      record.IS_ACTIVE ? '' : ' — disabled'
                    }}
                  </option>
                </select>
              </td>
              <td data-label="Action">
                <div class="row-actions">
                  <button
                    class="button secondary"
                    :disabled="busy || Number(squadOwners[account.ID]) === account.OWNER_ID"
                    @click="transferSquad(account)"
                  >
                    Change owner
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <Modal
      v-if="dialog"
      :title="dialog === 'reset' ? 'Reset password' : form.ID ? 'Edit user' : 'Create user'"
      @close="closeDialog"
    >
      <form class="modal-form" @submit.prevent="saveUser">
        <template v-if="dialog === 'user'">
          <label
            >Name<input v-model="form.NAME" maxlength="100" autocomplete="off" required
          /></label>
          <label
            >Email<input
              v-model="form.EMAIL"
              type="email"
              maxlength="254"
              autocomplete="off"
              required
          /></label>
          <label
            >Role<select v-model="form.ROLE">
              <option v-for="role in roles" :key="role.value" :value="role.value">
                {{ role.label }}
              </option></select
            ><small>{{ roles.find((r) => r.value === form.ROLE)?.detail }}</small></label
          >
          <label
            >Status<select v-model="form.IS_ACTIVE">
              <option :value="true">Active</option>
              <option :value="false">Disabled</option>
            </select></label
          >
          <label v-if="!form.ID"
            >Initial password<input
              v-model="form.PASSWORD"
              type="password"
              autocomplete="new-password"
              minlength="12"
              maxlength="256"
              required
            /><small>At least 12 characters.</small></label
          >
        </template>
        <template v-else>
          <p class="form-intro">
            Set a new password for {{ form.NAME }}. All their current sessions will be signed out.
          </p>
          <label
            >New password<input
              v-model="form.password"
              type="password"
              autocomplete="new-password"
              minlength="12"
              maxlength="256"
              required
          /></label>
          <label
            >Confirm new password<input
              v-model="form.confirm"
              type="password"
              autocomplete="new-password"
              minlength="12"
              maxlength="256"
              required
          /></label>
        </template>
        <div v-if="dialogError" class="alert" role="alert">{{ dialogError }}</div>
        <div class="modal-footer">
          <button type="button" class="button secondary" :disabled="busy" @click="closeDialog">
            Cancel</button
          ><button class="button primary" :disabled="busy">
            {{ busy ? 'Saving…' : dialog === 'reset' ? 'Reset password' : 'Save user' }}
          </button>
        </div>
      </form>
    </Modal>
  </template>
</template>

<style scoped>
.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  align-items: start;
}
.users-panel {
  margin-top: 24px;
}
@media (max-width: 800px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
  .users-panel .panel-heading {
    align-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
