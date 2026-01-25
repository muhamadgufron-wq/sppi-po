<template>
  <div class="animate-[fadeIn_0.5s_ease-out]">
    <div class="max-w-[1600px] mx-auto">
      <div class="mb-8">
        <h1 class="m-0 text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Halo, {{ authStore.user?.nama_lengkap || 'Tim Keuangan' }}</h1>
        <p class="m-0 mt-2 text-slate-500 font-medium">Dashboard Keuangan & Transfer.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <!-- Transfer Card -->
        <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg transition-all cursor-pointer group" @click="router.push('/transfer')">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 text-2xl group-hover:scale-110 transition-transform">
              💸
            </div>
            <div>
              <h3 class="font-bold text-lg text-slate-800 m-0">Transfer Dana</h3>
              <p class="text-sm text-slate-400 m-0">Proses PO yang disetujui</p>
            </div>
          </div>
           <div class="mt-4">
            <span class="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">Lihat Daftar Transfer</span>
          </div>
        </div>

        <!-- Laporan Keuangan Card -->
        <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-lg transition-all cursor-pointer group" @click="router.push('/keuangan')">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 text-2xl group-hover:scale-110 transition-transform">
              📊
            </div>
            <div>
              <h3 class="font-bold text-lg text-slate-800 m-0">Laporan Keuangan</h3>
              <p class="text-sm text-slate-400 m-0">Rekapitulasi Pengeluaran</p>
            </div>
          </div>
          <div class="mt-4">
            <span class="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">Buka Laporan</span>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
// import { useAutoRefresh } from '../../composables/useAutoRefresh'; // Not needed for static dashboard


const router = useRouter();
const authStore = useAuthStore();
</script>
