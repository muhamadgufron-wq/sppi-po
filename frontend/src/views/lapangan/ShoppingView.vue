<template>
  <div class="max-w-[1600px] mx-auto animate-[fadeIn_0.5s_ease-out]">
    
    <!-- Content Wrapper -->
    <div>
      <!-- Header & Tabs -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight mb-2">
            {{ isHistory ? 'Riwayat Belanja' : 'Belanja Lapangan' }}
          </h1>
          <p class="text-slate-500 font-medium">
            {{ isHistory ? 'Daftar belanja yang telah diselesaikan.' : 'Upload bukti dan input harga real.' }}
          </p>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-20">
        <div class="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
        <p class="text-slate-400 font-medium animate-pulse">Memuat data...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-100 rounded-2xl p-8 text-center max-w-lg mx-auto">
        <div class="text-4xl mb-4">⚠️</div>
        <h3 class="text-lg font-bold text-red-800 mb-2">Gagal Memuat Data</h3>
        <p class="text-red-600 mb-6">{{ error }}</p>
        <button @click="loadPOData" class="px-4 py-2 bg-white border border-red-200 text-red-700 rounded-xl text-sm font-bold hover:bg-red-50">
          Coba Lagi
        </button>
      </div>

      <!-- Empty State -->
      <div v-else-if="pos.length === 0" class="bg-white rounded-3xl border border-dashed border-slate-200 p-16 text-center max-w-2xl mx-auto">
        <div class="text-6xl mb-6 text-slate-200">🛒</div>
        <h3 class="text-xl font-bold text-slate-800 mb-2">Tidak Ada Data</h3>
        <p class="text-slate-500">
           {{ isHistory ? 'Belum ada riwayat belanja.' : 'Semua PO sudah dibelanjakan!' }}
        </p>
      </div>

      <!-- PO List -->
      <div v-else class="flex flex-col gap-8">
        <div v-for="po in pos" :key="po.id" class="bg-white rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden hover:shadow-lg transition-shadow duration-300">
          
          <!-- Card Header -->
          <div 
            class="p-6 md:p-8 bg-slate-50/50 border-b border-slate-100 cursor-pointer hover:bg-slate-100/50 transition-colors"
            @click="toggleExpand(po)"
          >
            <div class="flex flex-col md:flex-row justify-between md:items-center gap-6">
              <div class="flex items-start gap-4">
                <div>
                   <div class="flex items-center gap-3 mb-1">
                    <h3 class="text-xl font-bold text-slate-800">{{ po.po_number }}</h3>
                    <span :class="['px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border', getStatusClass(po.status)]">
                      {{ getStatusLabel(po.status) }}
                    </span>
                   </div>
                   <div class="flex flex-wrap gap-4 text-xs font-medium text-slate-500">
                     <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Req: {{ po.created_by_name }}</span>
                     <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-slate-300"></span> {{ formatDate(po.tanggal_po) }}</span>
                     <span v-if="po.items" class="flex items-center gap-1.5 text-slate-400">
                        <span class="w-1.5 h-1.5 rounded-full bg-slate-300"></span> 
                        {{ po.items.length }} Items
                     </span>
                   </div>
                </div>
              </div>

              <div class="flex flex-col md:items-end gap-2">
                <div>
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block md:text-right">Total Approved</span>
                  <span class="text-2xl font-bold text-slate-800">Rp {{ formatCurrency(po.total_approved || 0) }}</span>
                </div>
                <button 
                  class="text-xs font-bold text-slate-500 hover:text-emerald-600 flex items-center gap-1 md:justify-end transition-colors"
                >
                  {{ po.isExpanded ? 'Tutup Detail' : 'Input Belanja' }} 
                  <span class="text-[10px] transition-transform duration-300" :class="{ 'rotate-180': po.isExpanded }">▼</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Card Body -->
          <div v-show="po.isExpanded" class="p-6 md:p-8 transition-all duration-300">
            <h4 class="text-sm font-bold text-slate-800 mb-6 uppercase tracking-wider flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">📦</span> Detail Barang
            </h4>
            
            <!-- Items Table (Responsive Wrapper) -->
             <div class="border border-slate-200 rounded-2xl overflow-hidden mb-8">
               <div class="overflow-x-auto">
                <table class="w-full text-sm text-left">
                  <thead class="bg-slate-50 text-slate-500 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th class="px-6 py-4 min-w-[200px]">Item</th>
                      <th class="px-6 py-4 text-center">Qty</th>
                      <th class="px-6 py-4 text-center">Satuan</th>
                      <th class="px-6 py-4 text-right min-w-[140px]">Harga Approved</th>
                      <th class="px-6 py-4 text-right min-w-[160px] bg-amber-50/50 text-amber-900 border-l border-amber-100">Harga Real</th>
                      <th class="px-6 py-4 text-right min-w-[140px]">Subtotal Real</th>
                      <th class="px-6 py-4 text-center min-w-[100px]">Bukti</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    <tr v-for="item in po.items" :key="item.id" class="hover:bg-slate-50/80 transition-colors">
                      <td class="px-6 py-4 font-bold text-slate-700 align-middle">{{ item.nama_barang }}</td>
                      <td class="px-6 py-4 text-center font-medium text-slate-600 align-middle">{{ formatQty(item.qty_estimasi) }}</td>
                      <td class="px-6 py-4 text-center text-slate-500 text-sm align-middle">{{ item.satuan }}</td>
                      <td class="px-6 py-4 text-right text-slate-600 align-middle">Rp {{ formatCurrency(item.harga_approved || 0) }}</td>
                      
                      <!-- Harga Real Input/Display -->
                      <td class="px-6 py-4 align-middle bg-amber-50/20 border-l border-amber-50">
                        <div v-if="po.status !== 'BELANJA_SELESAI'">
                          <input 
                            v-model="item.harga_real_input"
                            @input="updateRealPrice(item)"
                            type="text"
                            class="w-full text-right bg-transparent border-b-2 border-slate-200 focus:border-amber-500 focus:outline-none p-1 font-bold text-slate-800 transition-colors placeholder-slate-300"
                            placeholder="0"
                          />
                        </div>
                        <div v-else class="text-right font-bold text-slate-800">
                          Rp {{ formatCurrency(item.harga_real || 0) }}
                        </div>
                      </td>

                      <td class="px-6 py-4 text-right font-bold text-amber-600 align-middle">
                        Rp {{ formatCurrency(isHistory ? (item.qty_real * item.harga_real) : getRealSubtotal(item)) }}
                      </td>

                      <!-- Bukti Foto -->
                      <td class="px-6 py-4 text-center align-middle">
                        <div v-if="po.status !== 'BELANJA_SELESAI'">
                           <input 
                            type="file" 
                            accept="image/*"
                            class="hidden"
                            :ref="(el) => setFileInputRef(el, item.id)"
                            @change="(e) => handleItemFileSelect(e, item)"
                          />
                          <button 
                            v-if="!item.previewUrl"
                            @click="triggerItemFileInput(item.id)" 
                            class="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors flex items-center justify-center mx-auto"
                            title="Upload Foto"
                          >
                            📷
                          </button>
                          <div v-else class="relative group inline-block">
                             <img 
                              :src="item.previewUrl" 
                              class="w-10 h-10 object-cover rounded-lg border border-slate-200 cursor-pointer shadow-sm"
                              @click="triggerItemFileInput(item.id)"
                            />
                            <button 
                              @click="removeItemPhoto(item)"
                              class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center shadow-sm cursor-pointer border-none z-10"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        <div v-else>
                          <img 
                             v-if="item.bukti_foto"
                             :src="item.bukti_foto.startsWith('http') ? item.bukti_foto : `http://localhost:3000/${item.bukti_foto}`" 
                             class="w-10 h-10 object-cover rounded-lg border border-slate-200 mx-auto cursor-zoom-in hover:scale-110 transition-transform"
                             @click="viewImage(item.bukti_foto.startsWith('http') ? item.bukti_foto : `http://localhost:3000/${item.bukti_foto}`)"
                           />
                           <span v-else class="text-[10px] text-slate-400 italic">No Foto</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Summary & Actions -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
               <!-- Total Bar -->
               <div class="bg-indigo-50/30 rounded-2xl border border-indigo-50 p-6 md:col-start-2">
                 <div class="flex justify-between items-center mb-3">
                    <span class="text-sm font-bold text-slate-500">Total Real (Belanja)</span>
                    <span class="text-2xl font-bold text-amber-600">
                      Rp {{ formatCurrency(isHistory ? po.total_real : getTotalReal(po)) }}
                    </span>
                 </div>
                 <div class="flex justify-between items-center opacity-60">
                    <span class="text-xs font-medium text-slate-500">Total Approved</span>
                    <span class="text-xs font-medium text-slate-500 decoration-slate-400">
                      Rp {{ formatCurrency(po.total_approved || 0) }}
                    </span>
                 </div>
               </div>

               <!-- Completed Info -->
               <div v-if="po.status === 'BELANJA_SELESAI'" class="md:col-start-1 md:row-start-1 bg-emerald-50 rounded-2xl border border-emerald-100 p-6">
                 <h4 class="text-emerald-800 font-bold mb-4 flex items-center gap-2">
                   <span class="text-lg">✅</span> Info Penyelesaian
                 </h4>
                 <div class="space-y-2">
                   <div class="flex justify-between border-b border-emerald-100 pb-2">
                     <span class="text-sm text-emerald-700">Tanggal Selesai</span>
                     <span class="font-bold text-emerald-800">{{ formatDate(po.shopping_completed_at) }}</span>
                   </div>
                   <div class="flex justify-between border-b border-emerald-100 pb-2">
                     <span class="text-sm text-emerald-700">Shopper</span>
                     <span class="font-bold text-emerald-800">{{ po.shopper_name || 'Admin' }}</span>
                   </div>
                 </div>
               </div>

               <!-- Action Button -->
               <div v-if="po.status !== 'BELANJA_SELESAI'" class="md:col-span-2 flex justify-end pt-4 border-t border-slate-100 mt-4">
                 <button 
                  @click="completeShopping(po)" 
                  class="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center gap-2"
                >
                  <span class="text-xl">✓</span> Selesaikan Belanja
                </button>
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

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useRouter } from 'vue-router';

import api from '../../services/api';

const router = useRouter();
// const authStore = useAuthStore();
const pos = ref<any[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const fileInputRefs = ref<Record<string, HTMLInputElement>>({});
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
    const endpoint = isHistory.value ? '/shopping/history' : '/shopping/active';
    const response = await api.get(endpoint);

    if (response.data.success) {
      pos.value = response.data.data.map((po: any) => ({
        ...po,
        isExpanded: false, // Default collapsed
        items: po.items?.map((item: any) => ({
          ...item,
          harga_real_input: item.harga_real ? formatPriceInput(item.harga_real) : '',
          harga_real_value: item.harga_real || 0,
          proofFile: null,
          previewUrl: null
        })) || []
      }));
    } else {
      error.value = response.data.message || 'Failed to load data';
    }
  } catch (err: any) {
    console.error('Failed to load:', err);
    error.value = err.response?.data?.message || 'Gagal memuat data';
  } finally {
    loading.value = false;
  }
}

function toggleExpand(po: any) {
  po.isExpanded = !po.isExpanded;
}

// File Input Handling
function setFileInputRef(el: any, itemId: number) {
  if (el) {
    fileInputRefs.value[`item_${itemId}`] = el as HTMLInputElement;
  }
}

function triggerItemFileInput(itemId: number) {
  const input = fileInputRefs.value[`item_${itemId}`];
  if (input) {
    input.click();
  }
}

import imageCompression from 'browser-image-compression';

async function handleItemFileSelect(event: Event, item: any) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  
  if (file) {
    try {
      // Show loading indicator on item? For now just log
      console.log(`Compressing ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)...`);
      
      const options = {
        maxSizeMB: 0.5, // Max 500KB
        maxWidthOrHeight: 1280, // Max width/height
        useWebWorker: true
      };

      const compressedFile = await imageCompression(file, options);
      console.log(`Compressed to ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
      
      // Convert Blob/File to File object with original name if needed (browser-image-compression returns File/Blob)
      // It returns a Blob that acts like a File in most cases.
      item.proofFile = compressedFile;

      // Preview
      const reader = new FileReader();
      reader.onload = (e) => {
        item.previewUrl = e.target?.result;
      };
      reader.readAsDataURL(compressedFile);

    } catch (error) {
      console.error('Compression failed:', error);
      alert('Gagal mengompres gambar. Silakan coba lagi.');
    }
  }
}

function removeItemPhoto(item: any) {
  item.proofFile = null;
  item.previewUrl = null;
  const input = fileInputRefs.value[`item_${item.id}`];
  if (input) input.value = ''; 
}

function formatPriceInput(value: number): string {
  if (!value || value === 0) return '';
  return Math.round(value).toLocaleString('id-ID');
}

function parsePriceInput(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/\./g, '');
  return parseInt(cleaned) || 0;
}

function updateRealPrice(item: any) {
  const numericValue = parsePriceInput(item.harga_real_input);
  item.harga_real_value = numericValue;
  item.harga_real_input = formatPriceInput(numericValue);
}

function getRealSubtotal(item: any): number {
  const qty = Number(item.qty_estimasi) || 0;
  const harga = item.harga_real_value || 0;
  return qty * harga;
}

function getTotalReal(po: any): number {
  if (!po.items || po.items.length === 0) return 0;
  return po.items.reduce((total: number, item: any) => {
    return total + getRealSubtotal(item);
  }, 0);
}

async function completeShopping(po: any) {
  const incompleteItems = po.items.filter((item: any) => !item.harga_real_value || item.harga_real_value <= 0);
  if (incompleteItems.length > 0) {
    alert('❌ Mohon isi harga real untuk semua item');
    return;
  }

  if (!confirm(`Selesaikan belanja untuk PO ${po.po_number}?\n\nTotal Real: Rp ${formatCurrency(getTotalReal(po))}`)) {
    return;
  }

  try {
    const formData = new FormData();
    const realPrices = po.items.map((item: any) => ({
      item_id: item.id,
      harga_real: item.harga_real_value
    }));
    formData.append('real_prices', JSON.stringify(realPrices));

    po.items.forEach((item: any) => {
      if (item.proofFile) {
        formData.append(`proof_item_${item.id}`, item.proofFile);
      }
    });

    await api.post(`/shopping/${po.id}/complete`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    alert('✅ Belanja berhasil diselesaikan!');
    await loadPOData();
  } catch (err: any) {
    console.error('Complete shopping error:', err);
    alert('❌ ' + (err.response?.data?.message || 'Gagal menyelesaikan belanja'));
  }
}

function viewImage(url: string) {
  currentImageUrl.value = url;
  showImageViewer.value = true;
}

function closeImageViewer() {
  showImageViewer.value = false;
}

function formatDate(date: string) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric'
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
    'APPROVED_KEUANGAN': 'bg-purple-100 text-purple-700 border-purple-200',
    'BELANJA_SELESAI': 'bg-emerald-100 text-emerald-700 border-emerald-200'
  };
  return map[status] || 'bg-slate-100 text-slate-600 border-slate-200';
}

function getStatusLabel(status: string) {
  if (status === 'APPROVED_KEUANGAN') return 'SHOPPING';
  return status.replace(/_/g, ' ');
}
</script>

<style>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
