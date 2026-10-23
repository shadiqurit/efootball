<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import Icon from './Icon.vue';
defineProps({ title: String, wide: Boolean });
const emit = defineEmits(['close']);
const panel = ref(null);
let previous;
const focusable = () => [
  ...panel.value.querySelectorAll(
    'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
  ),
];
function keydown(e) {
  if (e.key === 'Tab') {
    const items = focusable(),
      first = items[0],
      last = items.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }
}
onMounted(() => {
  previous = document.activeElement;
  document.body.style.overflow = 'hidden';
  focusable()[1]?.focus();
  document.addEventListener('keydown', keydown);
});
onBeforeUnmount(() => {
  document.body.style.overflow = '';
  document.removeEventListener('keydown', keydown);
  previous?.focus();
});
</script>
<template>
  <Teleport to="body"
    ><div class="modal-backdrop">
      <section
        ref="panel"
        class="modal"
        :class="{ wide }"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header>
          <div>
            <span class="eyebrow">TOUCHLINE WORKSPACE</span>
            <h2 id="modal-title">{{ title }}</h2>
          </div>
          <button
            type="button"
            class="icon-button"
            aria-label="Close dialog"
            @click="emit('close')"
          >
            <Icon name="close" />
          </button>
        </header>
        <slot />
      </section></div
  ></Teleport>
</template>
