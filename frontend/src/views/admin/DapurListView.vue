<template>
  <div class="max-w-[1200px] mx-auto animate-[fadeIn_0.5s_ease-out]">
    <!-- Header -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <Store class="w-8 h-8 text-emerald-600" />
          Master Dapur 
          <span class="text-sm font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 tracking-wide">{{ filteredDapurs.length }} DAPUR</span>
        </h1>
        <p class="text-slate-500 font-medium mt-1 ml-10">Kelola data dapur dan lokasi untuk tujuan Purchase Order.</p>
      </div>
      
      <button 
        @click="showCreateDialog = true" 
        class="group relative flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 hover:-translate-y-0.5 hover:shadow-xl hover:bg-emerald-700 transition-all duration-300"
      >
        <div class="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <PlusCircle class="w-5 h-5" />
        <span>Tambah Dapur</span>
      </button>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="bg-white p-4 rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-slate-100 mb-6 flex flex-col md:flex-row gap-4 items-center">
      <div class="relative flex-1 w-full group">
        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
          <Search class="w-5 h-5" />
        </div>
        <input 
          v-model="searchQuery" 
          type="text"
          placeholder="Cari berdasarkan nama, lokasi, atau kode..." 
          class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
        />
      </div>
      
      <div class="flex items-center gap-3 w-full md:w-auto">
        <div class="relative w-full md:w-48">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
             <Filter class="w-4 h-4" />
          </div>
          <select 
            v-model="filterStatus" 
            class="w-full pl-9 pr-8 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 appearance-none cursor-pointer hover:border-emerald-300 transition-colors shadow-sm"
          >
            <option value="all">Semua Status</option>
            <option value="active">🟢 Aktif</option>
            <option value="inactive">🔴 Non-aktif</option>
          </select>
          <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            <ChevronDown class="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20 text-slate-400">
      <div class="w-12 h-12 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
      <p class="font-medium animate-pulse">Memuat data dapur...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredDapurs.length === 0" class="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
      <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
        <Store class="w-10 h-10 text-slate-300" />
      </div>
      <h3 class="text-lg font-bold text-slate-800 mb-1">
        {{ searchQuery ? 'Tidak ada dapur ditemukan' : 'Belum ada data dapur' }}
      </h3>
      <p class="text-slate-500 max-w-xs text-center">
        {{ searchQuery ? 'Coba ubah kata kunci pencarian Anda.' : 'Tambahkan data dapur baru untuk mulai mengelola lokasi.' }}
      </p>
    </div>

    <!-- Dapur Grid/Table -->
    <div v-else class="bg-white rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
              <th class="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-widest">Detail Dapur</th>
              <th class="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-widest">Kontak PIC</th>
              <th class="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-widest text-center">Status</th>
              <th class="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-widest text-center">Performa</th>
              <th class="px-6 py-4 text-xs font-extrabold text-slate-400 uppercase tracking-widest text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="dapur in filteredDapurs" :key="dapur.id" class="group hover:bg-slate-50/50 transition-colors duration-200">
              <!-- Detail Dapur -->
              <td class="px-6 py-4 align-top">
                <div class="flex items-start gap-3">
                  <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-indigo-200 mt-1">
                    {{ dapur.kode_dapur.split('-')[1] || 'DP' }}
                  </div>
                  <div>
                    <h3 class="font-bold text-slate-800 text-sm group-hover:text-emerald-600 transition-colors">{{ dapur.nama_dapur }}</h3>
                    <div class="flex items-center gap-1 text-xs text-slate-500 font-medium mt-1">
                      <span class="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-bold border border-slate-200">{{ dapur.kode_dapur }}</span>
                    </div>
                    <p class="text-xs text-slate-400 leading-relaxed mt-1.5 max-w-[200px]" v-if="dapur.lokasi">
                      <MapPin class="w-3 h-3 inline mr-0.5" /> {{ dapur.lokasi }}
                    </p>
                  </div>
                </div>
              </td>

              <!-- PIC -->
              <td class="px-6 py-4 align-top">
                 <div v-if="dapur.pic_name" class="flex flex-col gap-1">
                   <div class="flex items-center gap-2 text-sm font-semibold text-slate-700">
                     <UserCircle2 class="w-4 h-4 text-slate-400" />
                     {{ dapur.pic_name }}
                   </div>
                   <div class="flex items-center gap-2 text-xs text-slate-500 ml-6" v-if="dapur.pic_phone">
                     <Phone class="w-3 h-3" />
                     {{ dapur.pic_phone }}
                   </div>
                 </div>
                 <span v-else class="text-xs text-slate-300 italic">Belum diset</span>
              </td>

              <!-- Status -->
              <td class="px-6 py-4 align-top text-center">
                <div 
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
                  :class="dapur.is_active 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                    : 'bg-red-50 text-red-700 border-red-100'"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="dapur.is_active ? 'bg-emerald-500' : 'bg-red-500'"></span>
                  {{ dapur.is_active ? 'Aktif' : 'Non-aktif' }}
                </div>
              </td>

              <!-- Total PO -->
              <td class="px-6 py-4 align-top text-center">
                 <div class="inline-flex flex-col">
                    <span class="text-lg font-bold text-slate-700">{{ dapur.total_po || 0 }}</span>
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Purchase Order</span>
                 </div>
              </td>

              <!-- Actions -->
              <td class="px-6 py-4 align-top text-right">
                <div class="flex justify-end gap-2">
                  <button
                    @click="editDapur(dapur)"
                    class="p-2 bg-white border border-slate-200 text-slate-500 rounded-lg hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 transition-all shadow-sm"
                    title="Edit Metadata"
                  >
                    <Edit3 class="w-4 h-4" />
                  </button>
                  <button
                    @click="toggleStatus(dapur)"
                    class="p-2 bg-white border border-slate-200 rounded-lg transition-all shadow-sm"
                    :class="dapur.is_active 
                      ? 'text-amber-500 hover:border-amber-300 hover:bg-amber-50' 
                      : 'text-emerald-500 hover:border-emerald-300 hover:bg-emerald-50'"
                    :title="dapur.is_active ? 'Non-aktifkan' : 'Aktifkan'"
                  >
                    <Power class="w-4 h-4" />
                  </button>
                  <button
                    @click="deleteDapur(dapur)"
                    :disabled="dapur.total_po > 0"
                    class="p-2 bg-white border border-slate-200 rounded-lg transition-all shadow-sm"
                    :class="dapur.total_po > 0 
                      ? 'text-slate-300 cursor-not-allowed opacity-50' 
                      : 'text-red-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600'"
                    title="Hapus Permanen"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create/Edit Dialog -->
    <DapurFormDialog 
      v-if="showCreateDialog || editingDapur"
      :dapur="editingDapur"
      @close="closeDialog"
      @saved="loadDapurs"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { 
  Store, 
  PlusCircle, 
  Search, 
  Filter, 
  ChevronDown, 
  UserCircle2, 
  MapPin, 
  Phone, 
  Edit3, 
  Power, 
  Trash2 
} from 'lucide-vue-next';
import api from '../../services/api';
import DapurFormDialog from './DapurFormDialog.vue';
import Swal from 'sweetalert2';

interface Dapur {
  id: number;
  kode_dapur: string;
  nama_dapur: string;
  lokasi?: string;
  pic_name?: string;
  pic_phone?: string;
  is_active: number;
  keterangan?: string;
  total_po: number;
  created_at: string;
  updated_at: string;
}

const dapurs = ref<Dapur[]>([]);
const loading = ref(false);
const searchQuery = ref('');
const filterStatus = ref('all');
const showCreateDialog = ref(false);
const editingDapur = ref<Dapur | null>(null);

const filteredDapurs = computed(() => {
  let result = dapurs.value;
  
  // Filter by search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(d => 
      d.kode_dapur.toLowerCase().includes(query) ||
      d.nama_dapur.toLowerCase().includes(query) ||
      d.lokasi?.toLowerCase().includes(query)
    );
  }
  
  // Filter by status
  if (filterStatus.value !== 'all') {
    result = result.filter(d => 
      filterStatus.value === 'active' ? d.is_active === 1 : d.is_active === 0
    );
  }
  
  return result;
});

async function loadDapurs() {
  loading.value = true;
  try {
    const response = await api.get('/dapur?all=true'); // Admin lihat semua
    dapurs.value = response.data.data;
  } catch (error: any) {
    alert(error.response?.data?.message || 'Gagal memuat data dapur');
  } finally {
    loading.value = false;
  }
}

function editDapur(dapur: Dapur) {
  editingDapur.value = { ...dapur };
}

async function toggleStatus(dapur: Dapur) {
  const action = dapur.is_active ? 'Non-aktifkan' : 'Aktifkan';
  
  const result = await Swal.fire({
    title: `${action} Dapur?`,
    text: `Anda yakin ingin me-${action.toLowerCase()} dapur "${dapur.nama_dapur}"?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: dapur.is_active ? '#f59e0b' : '#10b981',
    cancelButtonColor: '#64748b',
    confirmButtonText: `Ya, ${action}!`,
    cancelButtonText: 'Batal'
  });

  if (!result.isConfirmed) return;
  
  try {
    await api.patch(`/dapur/${dapur.id}/toggle`);
    await loadDapurs();
    
    Swal.fire({
      icon: 'success',
      title: 'Berhasil!',
      text: `Status dapur berhasil diperbarui.`,
      timer: 1500,
      showConfirmButton: false
    });
  } catch (error: any) {
    Swal.fire({
      icon: 'error',
      title: 'Gagal',
      text: error.response?.data?.message || `Gagal mengubah status dapur.`,
      confirmButtonColor: '#ef4444'
    });
  }
}

async function deleteDapur(dapur: Dapur) {
  if (dapur.total_po > 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Tidak Dapat Dihapus',
      text: `Dapur ini masih memiliki ${dapur.total_po} data PO terkait. Silakan non-aktifkan saja jika tidak lagi digunakan.`,
      confirmButtonColor: '#f59e0b'
    });
    return;
  }
  
  const result = await Swal.fire({
    title: 'Hapus Permanen?',
    text: `Anda akan menghapus dapur "${dapur.nama_dapur}". Tindakan ini tidak dapat dibatalkan!`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Ya, Hapus!',
    cancelButtonText: 'Batal'
  });
  
  if (!result.isConfirmed) return;
  
  try {
    await api.delete(`/dapur/${dapur.id}`);
    await loadDapurs();
    
    Swal.fire({
      icon: 'success',
      title: 'Terhapus!',
      text: 'Data dapur telah dihapus permanen.',
      timer: 1500,
      showConfirmButton: false
    });
  } catch (error: any) {
    Swal.fire({
      icon: 'error',
      title: 'Gagal',
      text: error.response?.data?.message || 'Gagal menghapus dapur.',
      confirmButtonColor: '#ef4444'
    });
  }
}

function closeDialog() {
  showCreateDialog.value = false;
  editingDapur.value = null;
}

onMounted(() => {
  loadDapurs();
});
</script>
