<template>
  <component :is="layout">
    <router-view />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AdminLayout from './layouts/AdminLayout.vue';

const route = useRoute();

const layout = computed(() => {
  if (route.meta.layout === 'admin') {
    return AdminLayout;
  }
  return 'div'; // Default no layout
});
</script>

<style>
#app {
  min-height: 100vh;
}

body {
  margin: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}
</style>
