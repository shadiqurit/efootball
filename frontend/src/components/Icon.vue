<script setup>
defineProps({ name: String, size: { default: 20 } });
const paths = {
  target:
    'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0 M12 10v4 M10 12h4',
  eye: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  eyeOff:
    'm3 3 18 18 M10.6 10.6a2 2 0 0 0 2.8 2.8 M9 5.4A11 11 0 0 1 12 5c7 0 10 7 10 7a16 16 0 0 1-3.3 4.3 M6.2 6.2A18 18 0 0 0 2 12s3 7 10 7a12 12 0 0 0 5.4-1.4',
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  game: 'M6 8h12a4 4 0 0 1 4 4v5a3 3 0 0 1-5 2l-2-2H9l-2 2a3 3 0 0 1-5-2v-5a4 4 0 0 1 4-4 M6 11v6 M3 14h6 M16 12h.01 M19 15h.01',
  chart: 'M4 3v17h17 M8 16v-4 M13 16V8 M18 16V5',
  history: 'M3 11a9 9 0 1 1 2 7 M3 4v7h7 M12 7v5l3 2',
  plus: 'M12 5v14 M5 12h14',
  search: 'm21 21-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  arrow: 'M5 12h14 m-5-5 5 5-5 5',
  chevron: 'm9 5 7 7-7 7',
  down: 'm6 9 6 6 6-6',
  close: 'm6 6 12 12 M6 18 18 6',
  edit: 'm16 3 5 5-12 12-6 1 1-6z M14 5l5 5',
  trash: 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
  globe: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M3 12h18 M12 3a18 18 0 0 1 0 18 18 18 0 0 1 0-18',
  star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z',
  export: 'M12 3v12 m-4-4 4 4 4-4 M4 15v6h16v-6',
  check: 'm5 12 4 4L19 6',
  logout: 'M9 21H3V3h6 M9 12h12 m-5-5 5 5-5 5',
  shield: 'm12 3 8 4v6c0 5-8 8-8 8s-8-3-8-8V7z M8 12l3 3 5-6',
  menu: 'M3 6h18 M3 12h18 M3 18h18',
  football:
    'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 m-9-5 5 4-2 6H9l-2-6z M12 3v4 M3.5 9l3.5 2 M6.5 19l2.5-2 M17.5 19 15 17 M20.5 9 17 11',
  info: 'M12 11v6 M12 7h.01 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
};
</script>
<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name] || paths.football" />
  </svg>
</template>
