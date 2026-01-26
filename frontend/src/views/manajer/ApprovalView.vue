
<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useRouter } from 'vue-router';

import api from '../../services/api';
import { 
  AlertCircle, 
  Inbox, 
  User, 
  Calendar, 
  Package, 
  CheckCircle2, 
  XCircle,
  FileText 
} from 'lucide-vue-next';

const router = useRouter();
// const authStore = useAuthStore();
const pos = ref<any[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const showImageViewer = ref(false);
const currentImageUrl = ref('');

onMounted(() => {
  loadPOData();
});

// Auto-refresh disabled due to interference with user input
// useAutoRefresh(loadPOData);

// Watch for route changes to reload data
watch(() => router.currentRoute.value.query.tab, () => {
  loadPOData();
});

const isHistory = computed(() => router.currentRoute.value.query.tab === 'history');

function toggleExpand(po: any) {
  po.expanded = !po.expanded;
}

async function loadPOData() {
  loading.value = true;
  error.value = null;
  pos.value = [];
  
  try {
    const endpoint = isHistory.value ? '/approval/history' : '/approval/pending';
    const response = await api.get(endpoint);
    
    if (response.data.success) {
      // Initialize input fields for each item
      pos.value = response.data.data.map((po: any) => ({
        ...po,
        expanded: false, // Default collapsed
        catatan_manajer_input: po.catatan_manajer || '',
        items: po.items?.map((item: any) => ({
          ...item,
          harga_approved_input: item.harga_approved ? formatPriceInput(item.harga_approved) : formatPriceInput(item.harga_estimasi), // Default fill with estimated if no approved
          harga_approved_value: item.harga_approved || item.harga_estimasi || 0 // Default value
        })) || []
      }));
    } else {
      error.value = response.data.message || 'Failed to load data';
    }
  } catch (err: any) {
    console.error('Failed to load:', err);
    error.value = err.response?.data?.message || err.message || 'Failed to load data';
  } finally {
    loading.value = false;
  }
}

function formatPriceInput(value: number): string {
  if (!value && value !== 0) return '';
  return Math.round(value).toLocaleString('id-ID');
}

function parsePriceInput(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/\./g, '');
  return parseInt(cleaned) || 0;
}

function updateApprovedPrice(item: any) {
  const numericValue = parsePriceInput(item.harga_approved_input);
  item.harga_approved_value = numericValue;
  
  // Format the input
  // const formatted = formatPriceInput(numericValue); // Optional: Auto-format while typing (can be annoying)
  // item.harga_approved_input = formatted; 
}

function getApprovedSubtotal(item: any): number {
  const qty = Number(item.qty_estimasi) || 0;
  const harga = item.harga_approved_value || 0;
  return qty * harga;
}

function getTotalApproved(po: any): number {
  if (!po.items || po.items.length === 0) return 0;
  return po.items.reduce((total: number, item: any) => {
    return total + getApprovedSubtotal(item);
  }, 0);
}

function validateApprovedPrices(po: any): boolean {
  if (!po.items || po.items.length === 0) return false;
  return po.items.every((item: any) => item.harga_approved_value >= 0); // Allow 0, but usually > 0
}

async function approve(po: any) {
  if (!validateApprovedPrices(po)) {
    alert('❌ Mohon periksa harga approved');
    return;
  }

  if (!confirm(`Approve PO ${po.po_number}?\n\nTotal Approved: Rp ${formatCurrency(getTotalApproved(po))}`)) {
    return;
  }

  try {
    const approved_prices = po.items.map((item: any) => ({
      item_id: item.id,
      harga_approved: item.harga_approved_value
    }));

    await api.post(`/approval/${po.id}/process`, {
      action: 'approve',
      catatan_manajer: po.catatan_manajer_input || null,
      approved_prices
    });

    alert('✅ PO berhasil disetujui!');
    await loadPOData();
  } catch (err: any) {
    console.error('Approve error:', err);
    alert('❌ ' + (err.response?.data?.message || 'Gagal approve PO'));
  }
}

async function reject(po: any) {
  const catatan = prompt('Alasan penolakan (wajib):');
  if (!catatan) return;

  try {
    await api.post(`/approval/${po.id}/process`, {
      action: 'reject',
      catatan_manajer: catatan
    });

    alert('✅ PO berhasil ditolak');
    await loadPOData();
  } catch (err: any) {
    console.error('Reject error:', err);
    alert('❌ ' + (err.response?.data?.message || 'Gagal reject PO'));
  }
}

function formatDate(date: string) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'short',
    year: 'numeric'
  });
}

function formatQty(qty: number) {
  return Math.round(qty);
}

function formatCurrency(amount: number) {
  return Math.round(amount).toLocaleString('id-ID');
}

function getStatusClass(status: string) {
  const map: any = {
    'APPROVED': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'MENUNGGU_APPROVAL': 'bg-amber-100 text-amber-700 border-amber-200',
    'DRAFT': 'bg-slate-100 text-slate-600 border-slate-200',
    'REJECTED': 'bg-red-100 text-red-700 border-red-200'
  };
  return map[status] || 'bg-slate-100 text-slate-600 border-slate-200';
}

function getStatusLabel(status: string) {
    return status.replace('_', ' ');
}

function viewImage(url: string) {
  currentImageUrl.value = url;
  showImageViewer.value = true;
}

function closeImageViewer() {
  showImageViewer.value = false;
}


</script>

<style>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>

<template>
  <div class="animate-[fadeIn_0.5s_ease-out]">
    <div class="max-w-[1200px] mx-auto animate-[fadeIn_0.5s_ease-out]">
      
      <!-- Header & Tabs -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 class="text-xl md:text-2xl font-bold text-slate-800 tracking-tight mb-1 flex items-center gap-2">
            <component :is="isHistory ? 'History' : 'Clock'" class="w-6 h-6 text-slate-700" />
            {{ isHistory ? 'Riwayat Approval' : 'Menunggu Approval' }}
          </h1>
          <p class="text-xs md:text-sm text-slate-500 font-medium ml-8">
            {{ isHistory ? 'Daftar PO yang telah diproses.' : 'Review dan setujui PO yang masuk.' }}
          </p>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-20">
        <div class="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
        <p class="text-slate-400 font-medium animate-pulse">Memuat data...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-100 rounded-xl p-6 text-center max-w-lg mx-auto">
        <div class="flex justify-center mb-3">
          <AlertCircle class="w-10 h-10 text-red-500" />
        </div>
        <h3 class="text-base font-bold text-red-800 mb-1">Gagal Memuat Data</h3>
        <p class="text-xs text-red-600 mb-4">{{ error }}</p>
        <button @click="loadPOData" class="px-4 py-2 bg-white border border-red-200 text-red-700 rounded-lg text-xs font-bold hover:bg-red-50">
          Coba Lagi
        </button>
      </div>

      <!-- Empty State -->
      <div v-else-if="pos.length === 0" class="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center max-w-xl mx-auto">
        <div class="flex justify-center mb-4">
          <Inbox class="w-16 h-16 text-slate-200" />
        </div>
        <h3 class="text-lg font-bold text-slate-800 mb-1">Tidak Ada Data</h3>
        <p class="text-sm text-slate-500">
           {{ isHistory ? 'Belum ada riwayat approval.' : 'Semua PO sudah diproses.' }}
        </p>
      </div>

      <!-- PO List -->
      <div v-else class="flex flex-col gap-4">
        <div v-for="po in pos" :key="po.id" class="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
          
          <!-- Card Header (Adjusted padding to match dashboard items) -->
          <div 
            class="p-5 md:p-6 bg-slate-50/30 border-b border-slate-100 cursor-pointer hover:bg-slate-100/50 transition-colors"
            @click="toggleExpand(po)"
          >
            <div class="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div class="flex items-start gap-4">
                <div>
                   <div class="flex items-center gap-3 mb-1">
                    <h3 class="text-base font-bold text-slate-800">{{ po.po_number }}</h3>
                    <span :class="['px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border', getStatusClass(po.status)]">
                      {{ getStatusLabel(po.status) }}
                    </span>
                   </div>
                   <div class="flex flex-wrap gap-3 text-[10px] font-medium text-slate-500">
                     <span class="flex items-center gap-1"><User class="w-3 h-3 text-slate-400" /> {{ po.created_by_name }}</span>
                     <span class="flex items-center gap-1"><Calendar class="w-3 h-3 text-slate-400" /> {{ formatDate(po.tanggal_po) }}</span>
                     <span v-if="isHistory && po.approved_by_name" class="flex items-center gap-1 text-emerald-600"><CheckCircle2 class="w-3 h-3" /> Approved by {{ po.approved_by_name }}</span>
                     <span class="flex items-center gap-1 text-slate-400">
                        <Package class="w-3 h-3" />
                        {{ po.items?.length || 0 }} Items
                     </span>
                     
                     
                     <!-- New: Proof Thumbnails (Transfer & Shopping) -->
                     <div class="flex items-center gap-2 mt-1">
                       
                       <!-- 1. Transfer Proof Thumbnail -->
                       <div v-if="po.transfers && po.transfers.length > 0 && po.transfers[0].proof_image" class="relative group" title="Bukti Transfer">
                          <div class="text-[9px] font-bold text-slate-400 mb-0.5">Transfer</div>
                          <img 
                            :src="po.transfers[0].proof_image.startsWith('http') ? po.transfers[0].proof_image : `http://localhost:3000/${po.transfers[0].proof_image}`"
                            class="w-12 h-12 object-cover rounded-lg border border-purple-200 cursor-pointer hover:scale-110 transition-transform shadow-sm"
                            @click.stop="viewImage(po.transfers[0].proof_image.startsWith('http') ? po.transfers[0].proof_image : `http://localhost:3000/${po.transfers[0].proof_image}`)"
                          />
                       </div>

                       <!-- 2. Shopping Proof Thumbnail (First Item) -->
                       <div v-if="po.items && po.items.some((i: any) => i.bukti_foto)" class="relative group" title="Bukti Belanja">
                          <div class="text-[9px] font-bold text-slate-400 mb-0.5">Belanja</div>
                          <img 
                            :src="po.items.find((i: any) => i.bukti_foto).bukti_foto.startsWith('http') ? po.items.find((i: any) => i.bukti_foto).bukti_foto : `http://localhost:3000/${po.items.find((i: any) => i.bukti_foto).bukti_foto}`"
                            class="w-12 h-12 object-cover rounded-lg border border-emerald-200 cursor-pointer hover:scale-110 transition-transform shadow-sm"
                            @click.stop="viewImage(po.items.find((i: any) => i.bukti_foto).bukti_foto.startsWith('http') ? po.items.find((i: any) => i.bukti_foto).bukti_foto : `http://localhost:3000/${po.items.find((i: any) => i.bukti_foto).bukti_foto}`)"
                          />
                       </div>

                     </div>
                   </div>
                </div>
              </div>

              <div class="flex flex-col md:items-end gap-1">
                <div>
                  <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 block md:text-right">Total Estimasi</span>
                  <span class="text-lg font-bold text-slate-800">Rp {{ formatCurrency(po.total_estimasi) }}</span>
                </div>
                <button 
                  class="text-[10px] font-bold text-slate-500 hover:text-emerald-600 flex items-center gap-1 md:justify-end transition-colors mt-1"
                >
                  {{ po.expanded ? 'Tutup Detail' : 'Lihat Detail' }} 
                  <span class="text-[10px] transition-transform duration-300" :class="{ 'rotate-180': po.expanded }">▼</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Card Body -->
          <div v-show="po.expanded" class="p-5 md:p-6 bg-white transition-all duration-300 ease-in-out">
            <h4 class="text-xs font-bold text-slate-800 mb-4 uppercase tracking-wider flex items-center gap-2">
              <Package class="w-4 h-4 text-emerald-600" /> Detail Barang
            </h4>
            
            <!-- Table Container -->
            <div class="border border-slate-200 rounded-xl overflow-hidden mb-6">
              <table class="w-full text-xs text-left">
                <thead class="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th class="px-4 py-3">Item</th>
                    <th class="px-4 py-3 text-center">Qty</th>
                    <th class="px-4 py-3 text-center">Satuan</th>
                    <th class="px-4 py-3 text-right">Harga Est.</th>
                    <th class="px-4 py-3 text-right w-[25%] bg-indigo-50/30 text-indigo-900 border-l border-indigo-100">Harga Approved</th>
                    <th class="px-4 py-3 text-right font-bold text-emerald-700">Subtotal</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="item in po.items" :key="item.id" class="hover:bg-slate-50/80 transition-colors">
                    <td class="px-4 py-3">
                      <div class="font-bold text-slate-700">{{ item.nama_barang }}</div>
                    </td>
                    <td class="px-4 py-3 text-center font-medium text-slate-600">
                      {{ formatQty(item.qty_estimasi) }}
                    </td>
                    <td class="px-4 py-3 text-center text-slate-500">
                      {{ item.satuan }}
                    </td>
                    <td class="px-4 py-3 text-right text-slate-500">
                      Rp {{ formatCurrency(item.harga_estimasi) }}
                    </td>
                    <td class="px-4 py-3 text-right bg-indigo-50/10 border-l border-indigo-50">
                       <div v-if="!isHistory">
                        <input 
                          v-model="item.harga_approved_input"
                          @input="updateApprovedPrice(item)"
                          type="text"
                          class="w-full text-right bg-transparent border-b border-slate-300 focus:border-emerald-500 focus:outline-none p-1 font-bold text-slate-800 transition-colors placeholder-slate-300 text-xs"
                          placeholder="0"
                        />
                      </div>
                      <div v-else class="font-bold text-slate-800">
                        Rp {{ formatCurrency(item.harga_approved || 0) }}
                      </div>
                    </td>
                    <td class="px-4 py-3 text-right font-bold text-emerald-600">
                      Rp {{ formatCurrency(isHistory ? (item.subtotal_approved || 0) : getApprovedSubtotal(item)) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Notes & Summary -->
             <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
               <!-- Left: Notes -->
               <div>
                 <label class="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                   <FileText class="w-3 h-3" /> Catatan untuk Admin
                 </label>
                 <textarea 
                  v-if="!isHistory"
                  v-model="po.catatan_manajer_input" 
                  rows="2" 
                  class="w-full p-3 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-xs font-medium resize-none placeholder-slate-400"
                  placeholder="Tambahkan catatan jika ada penyesuaian harga..."
                ></textarea>
                 <div v-else class="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-500 text-xs italic">
                  "{{ po.catatan_manajer || 'Tidak ada catatan.' }}"
                </div>
               </div>

               <!-- Right: Totals -->
               <div class="bg-indigo-50/30 rounded-xl border border-indigo-100 p-4">
                 <div class="flex justify-between items-center mb-2">
                    <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Approved</span>
                    <span class="text-xl font-bold text-indigo-700">
                      Rp {{ formatCurrency(isHistory ? (po.total_approved || 0) : getTotalApproved(po)) }}
                    </span>
                 </div>
                 <div class="flex justify-between items-center opacity-60">
                    <span class="text-[10px] font-medium text-slate-500">Estimasi Awal</span>
                    <span class="text-[10px] font-medium text-slate-500 decoration-slate-400 line-through">
                      Rp {{ formatCurrency(po.total_estimasi) }}
                    </span>
                 </div>
               </div>
             </div>

             <!-- Action Buttons -->
             <div v-if="!isHistory" class="mt-6 pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  @click="reject(po)" 
                  class="px-4 py-2 rounded-lg border border-slate-200 text-red-600 font-bold text-xs hover:bg-red-50 hover:border-red-100 transition-colors flex items-center gap-2"
                >
                  <XCircle class="w-4 h-4" /> Tolak
                </button>
                <button 
                  @click="approve(po)" 
                  class="px-6 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-200 transition-all hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <CheckCircle2 class="w-4 h-4" /> Setujui PO
                </button>
             </div>

          </div>
        </div>
      </div>
    
    </div>
    <!-- Image Viewer Modal -->
    <div v-if="showImageViewer" class="fixed inset-0 bg-black/95 flex items-center justify-center z-[9999] p-5 backdrop-blur-sm" @click="closeImageViewer">
      <div class="relative max-w-4xl w-full bg-transparent flex flex-col items-center" @click.stop>
        <button class="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors p-2" @click="closeImageViewer">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <img :src="currentImageUrl" alt="Bukti Full" class="max-h-[85vh] max-w-full rounded-lg shadow-2xl object-contain" />
      </div>
    </div>
  </div>
</template>
