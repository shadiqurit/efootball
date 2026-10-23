<script setup>
import { computed, nextTick, ref, useId, watch } from 'vue';
import Icon from './Icon.vue';

const props = defineProps({
  modelValue: [Number, String],
  options: { type: Array, default: () => [] },
  disabled: Boolean,
  help: String,
});
const emit = defineEmits(['update:modelValue']);
const inputId = `playing-style-${useId()}`;
const listId = `${inputId}-options`;
const root = ref(null);
const input = ref(null);
const open = ref(false);
const query = ref('');
const activeIndex = ref(0);
const options = computed(() => [{ ID: '', NAME: 'Not specified' }, ...props.options]);
const selectedLabel = computed(
  () => options.value.find((s) => s.ID === props.modelValue)?.NAME || 'Not specified',
);
const matches = computed(() =>
  options.value.filter((s) =>
    s.NAME.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase()),
  ),
);
const activeId = computed(() =>
  matches.value[activeIndex.value] ? `${listId}-${activeIndex.value}` : undefined,
);

function show() {
  if (props.disabled || open.value) return;
  query.value = '';
  activeIndex.value = Math.max(
    0,
    options.value.findIndex((s) => s.ID === props.modelValue),
  );
  open.value = true;
  revealActive();
}
function close() {
  open.value = false;
  query.value = '';
}
function search(event) {
  query.value = event.target.value;
  activeIndex.value = 0;
  open.value = true;
}
function choose(option) {
  emit('update:modelValue', option.ID);
  close();
}
async function revealActive() {
  await nextTick();
  root.value?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
}
function keydown(event) {
  if (event.key === 'Escape' && open.value) {
    event.preventDefault();
    event.stopPropagation();
    close();
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    if (!open.value) return show();
    const step = event.key === 'ArrowDown' ? 1 : -1;
    activeIndex.value = Math.max(0, Math.min(matches.value.length - 1, activeIndex.value + step));
    revealActive();
  } else if (event.key === 'Enter') {
    event.preventDefault();
    if (!open.value) show();
    else if (matches.value[activeIndex.value]) choose(matches.value[activeIndex.value]);
  } else if (event.key === 'Tab') close();
}
function toggle() {
  if (open.value) close();
  else {
    input.value?.focus();
    show();
  }
}
function focusout(event) {
  if (!root.value?.contains(event.relatedTarget)) close();
}
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) close();
  },
);
</script>

<template>
  <div ref="root" class="style-select" @focusout="focusout">
    <label :for="inputId">Playing style</label>
    <div class="style-select-control">
      <input
        :id="inputId"
        ref="input"
        class="search-input"
        role="combobox"
        :value="open ? query : selectedLabel"
        :placeholder="open ? 'Search playing styles…' : 'Not specified'"
        :disabled="disabled"
        autocomplete="off"
        :spellcheck="false"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        :aria-expanded="open"
        :aria-controls="open ? listId : undefined"
        :aria-activedescendant="open ? activeId : undefined"
        :aria-describedby="help ? `${inputId}-help` : undefined"
        @focus="show"
        @input="search"
        @keydown="keydown"
      />
      <button
        type="button"
        tabindex="-1"
        :disabled="disabled"
        :aria-label="open ? 'Close playing styles' : 'Show playing styles'"
        @mousedown.prevent
        @click="toggle"
      >
        <Icon name="down" :size="18" />
      </button>
    </div>
    <div v-if="open" class="style-select-menu">
      <ul :id="listId" role="listbox" aria-label="Playing styles">
        <li
          v-for="(style, index) in matches"
          :id="`${listId}-${index}`"
          :key="style.ID"
          role="option"
          :aria-selected="style.ID === modelValue"
          :data-active="index === activeIndex"
          @mousedown.prevent
          @click="choose(style)"
        >
          <span>{{ style.NAME }}</span
          ><Icon v-if="style.ID === modelValue" name="check" :size="17" />
        </li>
      </ul>
      <p v-if="!matches.length" role="status">No matching styles. Try another search.</p>
    </div>
    <small v-if="help" :id="`${inputId}-help`">{{ help }}</small>
  </div>
</template>
