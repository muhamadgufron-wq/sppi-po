
<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useRouter } from 'vue-router';

import api from '../../services/api';
import { 
  History, 
  CreditCard, 
  AlertCircle, 
  Inbox, 
  User, 
  Calendar, 
  CheckCircle2, 
  Lock,
  Check
} from 'lucide-vue-next';

const router = useRouter();
// const authStore = useAuthStore();
const pos = ref<any[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const showImageViewer = ref(false);
const currentImageUrl = ref('');

const isHistory = computed(() => router.currentRoute.value.query.tab === 'history');

onMounted(() => {
  loadPOData();
});

watch(() => router.currentRoute.value.query.tab, () => {
  loadPOData();
});

async function loadPOData() {
  loading.value = true;
  error.value = null;
  pos.value = [];
  
  try {
    const endpoint = isHistory.value ? '/keuangan/history' : '/keuangan/pending';
    const response = await api.get(endpoint);
    
    if (response.data.success) {
      pos.value = response.data.data.map((po: any) => ({
        ...po,
        isExpanded: false, 
        selectedItems: [], // Track selected items for transfer
        nominal_transfer_input: '',
        nominal_transfer_value: 0,
        tanggal_transfer_input: new Date().toISOString().split('T')[0],
        catatan_keuangan_input: '',
        proof_file: null // Track file
      }));
    } else {
      error.value = response.data.message || 'Failed to load data';
    }
  } catch (err: any) {
    console.error('Failed to load:', err);
    error.value = err.response?.data?.message || 'Failed to load data';
  } finally {
    loading.value = false;
  }
}

function toggleExpand(po: any) {
  po.isExpanded = !po.isExpanded;
}

// Item Selection Logic
function toggleItemSelection(po: any, item: any) {
  if (item.transfer_id) return; // Cannot select already transferred items

  if (po.selectedItems.includes(item.id)) {
    po.selectedItems = po.selectedItems.filter((id: number) => id !== item.id);
  } else {
    po.selectedItems.push(item.id);
  }
  // Auto-update nominal when selection changes
  useSelectedTotal(po);
}

function toggleSelectAll(po: any) {
  const pendingItems = po.items.filter((i: any) => !i.transfer_id);
  const allSelected = pendingItems.every((i: any) => po.selectedItems.includes(i.id));

  if (allSelected) {
    po.selectedItems = [];
  } else {
    po.selectedItems = pendingItems.map((i: any) => i.id);
  }
  useSelectedTotal(po);
}

function isAllSelected(po: any) {
  const pendingItems = po.items.filter((i: any) => !i.transfer_id);
  return pendingItems.length > 0 && pendingItems.every((i: any) => po.selectedItems.includes(i.id));
}

function getSelectedTotal(po: any) {
  if (!po.items) return 0;
  return po.items
    .filter((i: any) => po.selectedItems.includes(i.id))
    .reduce((sum: number, i: any) => sum + (Number(i.subtotal_approved) || 0), 0);
}

function useSelectedTotal(po: any) {
  const total = getSelectedTotal(po);
  po.nominal_transfer_value = total;
  po.nominal_transfer_input = formatPriceInput(total);
}

function getPendingItemsCount(po: any) {
  return po.items?.filter((i: any) => !i.transfer_id).length || 0;
}

function getTransferProgress(po: any) {
  if (!po.items || po.items.length === 0) return 0;
  const total = po.items.length;
  const paid = po.items.filter((i: any) => i.transfer_id).length;
  return (paid / total) * 100;
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

function updateTransferAmount(po: any) {
  const numericValue = parsePriceInput(po.nominal_transfer_input);
  po.nominal_transfer_value = numericValue;
  po.nominal_transfer_input = formatPriceInput(numericValue);
}

function handleFileUpload(event: Event, po: any) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    po.proof_file = target.files[0];
  } else {
    po.proof_file = null;
  }
}

async function processTransfer(po: any) {
  if (po.selectedItems.length === 0) {
    alert('❌ Pilih minimal satu item untuk ditransfer');
    return;
  }
  if (!po.nominal_transfer_value || po.nominal_transfer_value <= 0) {
    alert('❌ Nominal transfer harus diisi');
    return;
  }
  if (!po.tanggal_transfer_input) {
    alert('❌ Tanggal transfer harus diisi');
    return;
  }
  
  const totalSelected = getSelectedTotal(po);
  const diff = Math.abs(po.nominal_transfer_value - totalSelected);
  
  // Warning if transfer amount differs significantly from selected items total
  if (diff > 0) {
     if (!confirm(`⚠️ Nominal Transfer (Rp ${formatCurrency(po.nominal_transfer_value)}) berbeda dengan Total Item Terpilih (Rp ${formatCurrency(totalSelected)}).\n\nTetap lanjutkan?`)) {
       return;
     }
  }

  if (!confirm(`Proses Transfer untuk ${po.selectedItems.length} item?\n\nNominal: Rp ${formatCurrency(po.nominal_transfer_value)}`)) {
    return;
  }

  try {
    const formData = new FormData();
    formData.append('nominal_transfer', po.nominal_transfer_value.toString());
    formData.append('tanggal_transfer', po.tanggal_transfer_input);
    formData.append('catatan_keuangan', po.catatan_keuangan_input || '');
    formData.append('item_ids', JSON.stringify(po.selectedItems));
    
    if (po.proof_file) {
      formData.append('proof_image', po.proof_file);
    }

    await api.post(`/keuangan/${po.id}/transfer`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    alert('✅ Transfer berhasil diproses!');
    await loadPOData();
  } catch (err: any) {
    console.error('Transfer error:', err);
    alert('❌ ' + (err.response?.data?.message || 'Gagal memproses transfer'));
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
    'APPROVED': 'bg-amber-100 text-amber-700 border-amber-200',
    'PARTIAL_TRANSFER': 'bg-blue-100 text-blue-700 border-blue-200',
    'APPROVED_KEUANGAN': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'BELANJA_SELESAI': 'bg-slate-100 text-slate-700 border-slate-200'
  };
  return map[status] || 'bg-slate-100 text-slate-600 border-slate-200';
}

function getStatusLabel(status: string) {
  if (status === 'APPROVED') return 'WAITING TRANSFER';
  if (status === 'PARTIAL_TRANSFER') return 'PARTIAL TRANSFER';
  if (status === 'APPROVED_KEUANGAN') return 'FULL TRANSFERRED';
  if (status === 'APPROVED_KEUANGAN') return 'FULL TRANSFERRED';
  return status.replace(/_/g, ' ');
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
  <div class="max-w-[1200px] mx-auto animate-[fadeIn_0.5s_ease-out]">
    
    <!-- Content Wrapper with internal padding -->
    <div class="p-0 md:p-0">
      
      <!-- Header & Tabs -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 class="text-xl md:text-2xl font-bold text-slate-800 tracking-tight mb-1 flex items-center gap-2">
            <component :is="isHistory ? 'History' : 'CreditCard'" class="w-6 h-6 text-slate-700" />
            {{ isHistory ? 'Riwayat Transfer' : 'Proses Transfer' }}
          </h1>
          <p class="text-xs md:text-sm text-slate-500 font-medium ml-8">
            {{ isHistory ? 'Daftar PO yang telah ditransfer.' : 'Pilih item untuk melakukan pembayaran parsial/full.' }}
          </p>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-20">
        <div class="w-10 h-10 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin mb-4"></div>
        <p class="text-slate-400 font-medium animate-pulse">Memuat data...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-100 rounded-2xl p-8 text-center max-w-lg mx-auto">
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
           {{ isHistory ? 'Belum ada riwayat transfer.' : 'Semua PO sudah diproses! Tidak ada tagihan pending.' }}
        </p>
      </div>

      <!-- PO List -->
      <div v-else class="flex flex-col gap-4">
        <div v-for="po in pos" :key="po.id" class="bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
          
          <!-- Card Header -->
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
                     <span v-if="po.approved_by_name" class="flex items-center gap-1 text-emerald-600"><CheckCircle2 class="w-3 h-3" /> Appr: {{ po.approved_by_name }}</span>
                   </div>
                </div>
              </div>

              <div class="flex flex-col md:items-end gap-1">
                <div>
                  <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 block md:text-right">Total Approved</span>
                  <span class="text-lg font-bold text-slate-800">Rp {{ formatCurrency(po.total_approved || 0) }}</span>
                </div>
                <!-- Progress Bar / Status Text -->
                <div class="flex items-center gap-2 mt-1">
                  <div class="h-1.5 w-16 bg-slate-200 rounded-full overflow-hidden">
                    <div class="h-full bg-emerald-500" :style="{ width: getTransferProgress(po) + '%' }"></div>
                  </div>
                  <span class="text-[9px] font-bold text-slate-400">{{ getPendingItemsCount(po) }} Item Pending</span>
                </div>
                
                <button 
                  class="text-[10px] font-bold text-slate-500 hover:text-emerald-600 flex items-center gap-1 md:justify-end transition-colors mt-2"
                >
                  {{ po.isExpanded ? 'Tutup Detail' : 'Proses Transfer' }} 
                  <span class="text-[10px] transition-transform duration-300" :class="{ 'rotate-180': po.isExpanded }">▼</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Card Body -->
          <div v-show="po.isExpanded" class="p-5 md:p-6 bg-white transition-all duration-300">
            
            <!-- Items Table -->
            <div class="flex justify-between items-center mb-4">
               <h4 class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                 <Package class="w-4 h-4 text-emerald-600" /> Pilih Item untuk Ditransfer
               </h4>
               <button 
                 v-if="!isHistory && getPendingItemsCount(po) > 0"
                 @click="toggleSelectAll(po)"
                 class="text-[10px] font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50 px-2 py-1 rounded transition-colors"
               >
                 {{ isAllSelected(po) ? 'Deselect All' : 'Select All Pending' }}
               </button>
            </div>

            <div class="border border-slate-200 rounded-xl overflow-hidden mb-6">
              <table class="w-full text-xs text-left">
                <thead class="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th class="px-4 py-3 w-8 text-center" v-if="!isHistory">
                      #
                    </th>
                    <th class="px-4 py-3">Item</th>
                    <th class="px-4 py-3 text-center">Qty</th>
                    <th class="px-4 py-3 text-center">Satuan</th>
                    <th class="px-4 py-3 text-right">Harga Approved</th>
                    <th class="px-4 py-3 text-right">Subtotal</th>
                    <th class="px-4 py-3 text-center">Bukti Belanja</th>
                    <th class="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr 
                    v-for="item in po.items" 
                    :key="item.id" 
                    class="transition-colors"
                    :class="[
                      item.transfer_id ? 'bg-slate-50/50' : 'hover:bg-slate-50',
                      po.selectedItems.includes(item.id) ? 'bg-amber-50/50' : ''
                    ]"
                    @click="!item.transfer_id && !isHistory ? toggleItemSelection(po, item) : null"
                    :style="{ cursor: !item.transfer_id && !isHistory ? 'pointer' : 'default' }"
                  >
                    <td class="px-4 py-3 text-center" v-if="!isHistory">
                       <div v-if="!item.transfer_id" class="flex justify-center">
                          <div 
                            class="w-4 h-4 rounded border flex items-center justify-center transition-all duration-200"
                            :class="po.selectedItems.includes(item.id) ? 'bg-amber-500 border-amber-500' : 'border-slate-300 bg-white'"
                          >
                            <Check v-if="po.selectedItems.includes(item.id)" class="w-3 h-3 text-white" />
                          </div>
                       </div>
                       <div v-else>
                         <Lock class="w-3 h-3 text-slate-300 mx-auto" />
                       </div>
                    </td>
                    <td class="px-4 py-3 font-bold text-slate-700">
                      {{ item.nama_barang }}
                      <span v-if="item.transfer_id" class="ml-2 text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">PAID</span>
                    </td>
                    <td class="px-4 py-3 text-center font-medium text-slate-600">{{ formatQty(item.qty_estimasi) }}</td>
                    <td class="px-4 py-3 text-center text-slate-500 text-sm">{{ item.satuan }}</td>
                    <td class="px-4 py-3 text-right text-slate-600">Rp {{ formatCurrency(item.harga_approved || 0) }}</td>
                    <td class="px-4 py-3 text-right font-bold text-emerald-600">Rp {{ formatCurrency(item.subtotal_approved || 0) }}</td>
                    <td class="px-4 py-3 text-center">
                       <img 
                         v-if="item.bukti_foto"
                         :src="`http://localhost:3000/${item.bukti_foto}`" 
                         class="w-8 h-8 object-cover rounded border border-slate-200 mx-auto cursor-pointer hover:scale-110 transition-transform"
                         @click.stop="viewImage(`http://localhost:3000/${item.bukti_foto}`)"
                         title="Lihat Bukti"
                       />
                       <span v-else class="text-[10px] text-slate-300">-</span>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span v-if="item.transfer_id" class="text-xs font-bold text-emerald-600">Selesai</span>
                      <span v-else class="text-xs font-bold text-slate-400">Pending</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Transfer Info & History -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              
              <!-- Left Column: History & Summary -->
              <div class="flex flex-col gap-4">
                 <!-- Current Selection Summary -->
                 <div class="bg-indigo-50/30 rounded-xl border border-indigo-100 p-4">
                   <div class="flex justify-between items-center mb-2">
                      <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Total PO</span>
                      <span class="text-lg font-bold text-slate-800">
                        Rp {{ formatCurrency(po.total_approved || 0) }}
                      </span>
                   </div>
                   <div class="flex justify-between items-center opacity-70 border-t border-indigo-100/50 pt-2 mt-1">
                      <span class="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Sudah Ditransfer</span>
                      <span class="text-sm font-bold text-indigo-700">
                         Rp {{ formatCurrency(po.nominal_transfer || 0) }}
                      </span>
                   </div>
                 </div>

                 <!-- Transfer History List -->
                 <div v-if="po.transfers && po.transfers.length > 0">
                    <h5 class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                       <History class="w-3 h-3" /> Riwayat Transfer
                    </h5>
                    <div class="space-y-2">
                      <div v-for="t in po.transfers" :key="t.id" class="bg-slate-50 border border-slate-100 p-3 rounded-lg text-xs">
                         <div class="flex justify-between items-center mb-1">
                            <span class="font-bold text-slate-700">Rp {{ formatCurrency(t.amount) }}</span>
                            <span class="text-[10px] text-slate-500">{{ formatDate(t.transfer_date) }}</span>
                         </div>
                         <p v-if="t.notes" class="text-slate-500 italic truncate">"{{ t.notes }}"</p>
                      </div>
                    </div>
                 </div>
              </div>

              <!-- Right Column: Form Section -->
              <div>
                <!-- Display Only (History / Fully Paid) -->
                <div v-if="isHistory || getPendingItemsCount(po) === 0" class="bg-emerald-50 rounded-xl border border-emerald-100 p-5 text-center">
                   <div class="inline-flex p-3 bg-emerald-100 rounded-full text-emerald-600 mb-2">
                      <CheckCircle2 class="w-6 h-6" />
                   </div>
                   <h4 class="text-emerald-800 font-bold mb-1">Pembayaran Selesai</h4>
                   <p class="text-xs text-emerald-600">Semua item telah ditransfer sepenuhnya.</p>
                </div>

                <!-- Input Form (Pending) -->
                <div v-else class="bg-white border-2 border-amber-50 rounded-xl p-5 shadow-sm relative overflow-hidden">
                  <div v-if="po.selectedItems.length === 0" class="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                     <p class="text-xs font-bold uppercase tracking-wider mb-1">Pilih Item Dahulu</p>
                     <p class="text-[10px]">Klik item di tabel sebelah kiri untuk memulai transfer.</p>
                  </div>

                  <h4 class="text-amber-600 font-bold mb-4 flex items-center gap-2 text-sm relative z-0">
                    <CreditCard class="w-4 h-4" /> Transfer Baru
                  </h4>
                  
                  <div class="space-y-4 relative z-0">
                    <div class="p-3 bg-amber-50 rounded-lg border border-amber-100">
                       <div class="flex justify-between items-center text-xs mb-1">
                          <span class="text-amber-700 font-medium">{{ po.selectedItems.length }} Item Dipilih</span>
                          <span class="text-amber-700 font-bold">Total: Rp {{ formatCurrency(getSelectedTotal(po)) }}</span>
                       </div>
                    </div>

                    <div>
                      <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex justify-between">
                         <span>Nominal Transfer</span>
                         <span class="text-[9px] text-emerald-600 cursor-pointer hover:underline" @click="useSelectedTotal(po)">Set Sesuai Selected</span>
                      </label>
                      <input 
                        v-model="po.nominal_transfer_input"
                        @input="updateTransferAmount(po)"
                        type="text"
                        class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all text-right text-sm"
                      />
                    </div>
                    
                    <div>
                      <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tanggal Transfer</label>
                       <input 
                        v-model="po.tanggal_transfer_input"
                        type="date"
                        class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all text-sm"
                      />
                    </div>

                    <div>
                      <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Bukti Transfer (Gambar/PDF)</label>
                      <input 
                        type="file"
                        @change="(e) => handleFileUpload(e, po)"
                        accept="image/*,application/pdf"
                        class="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 transition-all border border-slate-200 rounded-lg"
                      />
                    </div>

                    <div>
                      <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Catatan (Optional)</label>
                      <textarea 
                        v-model="po.catatan_keuangan_input"
                        rows="2"
                        class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all resize-none"
                        placeholder="Info bank / nomor referensi..."
                      ></textarea>
                    </div>

                    <button 
                      @click="processTransfer(po)"
                      class="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm rounded-lg shadow-md shadow-amber-500/20 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 class="w-4 h-4" /> Proses Transfer
                    </button>
                  </div>
                </div>
              </div>
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
