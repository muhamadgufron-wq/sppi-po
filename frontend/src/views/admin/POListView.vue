<template>
  <div class="max-w-[1200px] mx-auto">
    <!-- Header -->
    <div class="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="m-0 text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">📋 Daftar Penawaran Harga PO</h1>
        <p class="m-0 mt-1 text-slate-500 font-medium">Kelola penawaran harga dan pantau status pengajuan Purchase Order.</p>
      </div>
      <div class="flex flex-col md:flex-row gap-3 w-full md:w-auto">
        <!-- Search Bar -->
        <div class="relative group w-full md:w-72">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-emerald-600 text-slate-400">
            <Search class="w-5 h-5" />
          </div>
          <input 
            v-model="searchQuery" 
            @input="handleSearch"
            type="text" 
            placeholder="Cari Nomor PO..." 
            class="block w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm group-hover:border-emerald-300"
          >
          <div v-if="searchQuery" class="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-slate-400 hover:text-red-500 transition-colors" @click="clearSearch">
            <XCircle class="w-5 h-5" />
          </div>
        </div>

        <router-link v-if="authStore.userRole === 'ADMIN'" to="/po/create" class="flex items-center justify-center gap-2 py-3 px-6 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 hover:-translate-y-0.5 active:translate-y-0 no-underline whitespace-nowrap">
          <span class="text-xl leading-none font-light">+</span> <span>Buat Penawaran</span>
        </router-link>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20 text-slate-400">
      <div class="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
      <p class="font-medium">Memuat data...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="pos.length === 0" class="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
      <div v-if="searchQuery" class="mb-4 text-4xl">🔍</div>
      <div v-else class="text-5xl mb-4">📝</div>
      <h3 class="text-lg font-bold text-slate-800 mb-2">{{ searchQuery ? 'Tidak ditemukan' : 'Belum ada Penawaran Harga' }}</h3>
      <p class="text-slate-500 max-w-md mx-auto mb-6">{{ searchQuery ? 'Tidak ada PO dengan nomor ' + searchQuery : 'Mulai buat penawaran harga PO untuk supplier sayuran.' }}</p>
      <button v-if="searchQuery" @click="clearSearch" class="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-50 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors">
        Reset Pencarian
      </button>
      <router-link v-else-if="authStore.userRole === 'ADMIN'" to="/po/create" class="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-50 text-emerald-700 font-bold rounded-xl hover:bg-emerald-100 transition-colors no-underline">
        Buat Penawaran Sekarang
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
              <h3 class="m-0 text-sm font-bold text-slate-800 tracking-tight group-hover:text-emerald-600 transition-colors">
                <span v-html="highlightMatch(po.po_number)"></span>
              </h3>
              <p class="m-0 text-[10px] text-slate-400 font-medium mt-0.5">
                {{ formatDate(po.tanggal_po) }}
                <span class="mx-1">•</span>
                <span class="inline-flex items-center gap-1 font-semibold text-slate-600">
                  🏢 {{ po.nama_dapur || 'Dapur Umum' }}
                </span>
              </p>
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
          <div class="flex flex-col gap-2">
            <!-- Total Estimasi -->
            <div class="p-3 bg-gradient-to-br from-emerald-50 to-emerald-50/30 rounded-xl border border-emerald-100">
              <p class="text-[9px] uppercase font-bold text-emerald-600 tracking-wider mb-1">Total Estimasi</p>
              <p class="text-lg font-bold text-emerald-700">Rp {{ formatCurrency(po.total_estimasi || 0) }}</p>
            </div>

            <!-- Info Note -->
            <div class="p-2.5 bg-slate-50/80 rounded-lg border border-slate-100">
              <p class="text-[10px] text-slate-500 text-center">
                💡 Klik untuk detail profit & margin
              </p>
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
              Ajukan ke Manajer
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

    <!-- Pagination Controls -->
    <div v-if="totalPages > 1" class="mt-8 flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
      <div class="text-sm text-slate-500 font-medium">
        Menampilkan <span class="font-bold text-slate-700">{{ pos.length }}</span> dari <span class="font-bold text-slate-700">{{ totalPOs }}</span> data
      </div>
      
      <div class="flex items-center gap-2">
        <button 
          @click="prevPage" 
          :disabled="currentPage === 1"
          class="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft class="w-5 h-5" />
        </button>
        
        <div class="px-4 py-2 bg-slate-50 rounded-lg text-sm font-bold text-slate-700 border border-slate-200">
          Hal. {{ currentPage }} / {{ totalPages }}
        </div>

        <button 
          @click="nextPage" 
          :disabled="currentPage === totalPages"
          class="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight class="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Search, XCircle, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import Swal from 'sweetalert2';
import api from '../../services/api';
import { useAuthStore } from '../../stores/auth';
import type { PurchaseOrder } from '../../types';

const authStore = useAuthStore();
const router = useRouter();
const pos = ref<PurchaseOrder[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const currentPage = ref(1);
const totalPages = ref(1);
const limit = 15;
const totalPOs = ref(0);
let searchTimeout: any;

onMounted(async () => {
  await loadPOs();
});

function handleSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage.value = 1; // Reset to page 1 on search
    loadPOs();
  }, 300);
}

function clearSearch() {
  searchQuery.value = '';
  currentPage.value = 1;
  loadPOs();
}

function highlightMatch(text: string) {
  if (!searchQuery.value) return text;
  const regex = new RegExp(`(${searchQuery.value})`, 'gi');
  return text.replace(regex, '<span class="bg-yellow-200 text-slate-800">$1</span>');
}

async function loadPOs() {
  loading.value = true;
  try {
    const params: any = {
      page: currentPage.value,
      limit: limit
    };
    if (searchQuery.value) {
      params.search = searchQuery.value;
    }
    
    const response = await api.get('/po', { params });
    if (response.data.success) {
      pos.value = response.data.data;
      if (response.data.pagination) {
        totalPages.value = response.data.pagination.totalPages;
        totalPOs.value = response.data.pagination.total;
      }
    }
  } catch (error) {
    console.error('Failed to load POs:', error);
  } finally {
    loading.value = false;
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    loadPOs();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
    loadPOs();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

async function submitPO(poId: number) {
  const result = await Swal.fire({
    title: 'Ajukan Penawaran?',
    text: "Penawaran harga akan dikirim ke Manajer untuk review dan approval.",
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#10b981', // Emerald-500
    cancelButtonColor: '#64748b', // Slate-500
    confirmButtonText: 'Ya, Submit!',
    cancelButtonText: 'Batal'
  });

  if (!result.isConfirmed) return;

  // Show loading
  Swal.fire({
    title: 'Memproses...',
    text: 'Mohon tunggu sebentar',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  try {
    const response = await api.post(`/po/${poId}/submit`);
    
    if (response.data.success) {
      await Swal.fire({
        title: 'Berhasil!',
        text: 'Penawaran harga telah diajukan ke Manajer untuk approval.',
        icon: 'success',
        confirmButtonColor: '#10b981',
        timer: 2000,
        timerProgressBar: true
      });
      await loadPOs(); // Reload PO list
    } else {
      Swal.fire({
        title: 'Gagal',
        text: response.data.message || 'Gagal submit PO',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
    }
  } catch (error: any) {
    console.error('Submit PO error:', error);
    Swal.fire({
      title: 'Error',
      text: error.response?.data?.message || 'Terjadi kesalahan sistem',
      icon: 'error',
      confirmButtonColor: '#ef4444'
    });
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
