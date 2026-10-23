import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';

export function useNavigationDrawer(open) {
  const drawer = ref(null);
  const menuButton = ref(null);
  let previousFocus;
  let media;
  const focusable = () => [
    ...(drawer.value?.querySelectorAll('a[href],button:not(:disabled)') || []),
  ];
  watch(open, async (value) => {
    document.body.style.overflow = value ? 'hidden' : '';
    if (value) {
      previousFocus = document.activeElement;
      await nextTick();
      focusable()[0]?.focus();
    } else previousFocus?.focus();
  });
  function onKeydown(event) {
    if (!open.value) return;
    if (event.key === 'Escape') {
      open.value = false;
      return;
    }
    if (event.key !== 'Tab') return;
    const items = focusable(),
      first = items[0],
      last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  function onViewportChange(event) {
    if (!event.matches) open.value = false;
  }
  onMounted(() => {
    media = window.matchMedia('(max-width: 900px)');
    media.addEventListener('change', onViewportChange);
  });
  onBeforeUnmount(() => {
    media?.removeEventListener('change', onViewportChange);
    if (open.value) document.body.style.overflow = '';
  });
  return { drawer, menuButton, onKeydown };
}
