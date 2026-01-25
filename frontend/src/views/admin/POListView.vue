<template>
  <div class="max-w-[1200px] mx-auto">
    <!-- Header -->
    <div class="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="m-0 text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Daftar Purchase Orders</h1>
        <p class="m-0 mt-1 text-slate-500 font-medium">Kelola dan pantau status pengajuan PO.</p>
      </div>
      <router-link v-if="authStore.userRole === 'ADMIN'" to="/po/create" class="flex items-center justify-center gap-2 py-3 px-6 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 no-underline">
        <span class="text-xl leading-none">+</span> Buat PO Baru
      </router-link>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20 text-slate-400">
      <div class="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
      <p class="font-medium">Memuat data...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="pos.length === 0" class="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
      <div class="text-5xl mb-4">📝</div>
      <h3 class="text-lg font-bold text-slate-800 mb-2">Belum ada Purchase Order</h3>
      <p class="text-slate-500 max-w-md mx-auto mb-6">Mulai buat pengajuan PO baru untuk supplier sayuran.</p>
      <router-link v-if="authStore.userRole === 'ADMIN'" to="/po/create" class="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-50 text-emerald-700 font-bold rounded-xl hover:bg-emerald-100 transition-colors no-underline">
        Buat PO Sekarang
      </router-link>
    </div>

    <!-- PO List Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
      <div v-for="po in pos" :key="po.id" class="group bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-slate-100 hover:border-emerald-200 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col" @click="router.push(`/po/${po.id}`)">
        
        <!-- Card Header -->
        <div class="p-4 pb-0 flex justify-between items-start mb-2">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-base shadow-md shadow-emerald-500/20">
              📄
            </div>
            <div>
              <h3 class="m-0 text-sm font-bold text-slate-800 tracking-tight group-hover:text-emerald-600 transition-colors">{{ po.po_number }}</h3>
              <p class="m-0 text-[10px] text-slate-400 font-medium mt-0.5">{{ formatDate(po.tanggal_po) }}</p>
            </div>
          </div>
          <span 
            class="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border"
            :class="{
              'bg-blue-50 text-blue-700 border-blue-100': po.status === 'DRAFT' || po.status === 'DANA_DITRANSFER',
              'bg-amber-50 text-amber-700 border-amber-100': po.status === 'MENUNGGU_APPROVAL',
              'bg-emerald-50 text-emerald-700 border-emerald-100': po.status === 'APPROVED',
              'bg-red-50 text-red-700 border-red-100': po.status === 'REJECTED',
              'bg-purple-50 text-purple-700 border-purple-100': po.status === 'BELANJA_SELESAI'
            }"
          >{{ po.status.replace('_', ' ') }}</span>
        </div>

        <!-- Card Body -->
        <div class="p-4 pt-2 flex-1">
          <div class="flex justify-between items-end p-2.5 bg-slate-50/50 rounded-xl border border-slate-100">
            <div>
              <p class="text-[9px] uppercase font-bold text-slate-400 tracking-wider mb-1">Total Harga Real</p>
              <p class="text-xs font-bold text-emerald-700">Rp {{ formatCurrency(po.total_real || po.total_estimasi) }}</p>
            </div>
            <!-- Arrow icon that moves on hover -->
            <div class="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:border-emerald-100 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="group-hover:translate-x-0.5 transition-transform"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </div>
          </div>
        </div>

        <!-- Card Actions (Only for Draft) -->
        <div v-if="po.status === 'DRAFT'" class="px-4 pb-4 pt-0 mt-auto" @click.stop>
          <div class="flex gap-2">
            <button 
              @click="submitPO(po.id)" 
              class="flex-1 py-2.5 px-3 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200"
            >
              Submit Approval
            </button>
            <button 
              @click="router.push(`/po/${po.id}`)" 
              class="px-3 py-2.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors"
            >
              Detail
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../services/api';
import { useAuthStore } from '../../stores/auth';
import { useAutoRefresh } from '../../composables/useAutoRefresh';
import type { PurchaseOrder } from '../../types';

const authStore = useAuthStore();
const router = useRouter();
const pos = ref<PurchaseOrder[]>([]);
const loading = ref(false);

onMounted(async () => {
  await loadPOs();
});

// Auto-refresh disabled
// useAutoRefresh(loadPOs);

async function loadPOs() {
  loading.value = true;
  try {
    const response = await api.get('/po');
    if (response.data.success) {
      pos.value = response.data.data;
    }
  } catch (error) {
    console.error('Failed to load POs:', error);
  } finally {
    loading.value = false;
  }
}

async function submitPO(poId: number) {
  if (!confirm('Submit PO ini untuk approval? PO akan dikirim ke Manajer untuk di-review.')) {
    return;
  }

  try {
    const response = await api.post(`/po/${poId}/submit`);
    
    if (response.data.success) {
      alert('✅ PO berhasil disubmit untuk approval!');
      await loadPOs(); // Reload PO list
    } else {
      alert('❌ ' + (response.data.message || 'Gagal submit PO'));
    }
  } catch (error: any) {
    console.error('Submit PO error:', error);
    alert('❌ ' + (error.response?.data?.message || 'Terjadi kesalahan saat submit PO'));
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function formatCurrency(amount: number) {
  return Math.round(amount).toLocaleString('id-ID');
}
</script>
