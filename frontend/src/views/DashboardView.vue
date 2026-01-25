<template>
  <component :is="currentDashboard" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import DashboardAdmin from './dashboard/DashboardAdmin.vue';
import DashboardManajer from './dashboard/DashboardManajer.vue';
import DashboardKeuangan from './dashboard/DashboardKeuangan.vue';
import DashboardLapangan from './dashboard/DashboardLapangan.vue';

const authStore = useAuthStore();

const currentDashboard = computed(() => {
  const role = authStore.userRole;
  
  switch (role) {
    case 'ADMIN':
      return DashboardAdmin;
    case 'MANAJER':
      return DashboardManajer;
    case 'KEUANGAN':
      return DashboardKeuangan;
    case 'LAPANGAN':
      return DashboardLapangan;
    default:
      return DashboardAdmin; // Fallback to Admin or maybe a generic View
  }
});
</script>
