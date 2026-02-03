
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../services/api';

const router = useRouter();
const loading = ref(false);

const formData = ref({
  tanggal_po: new Date().toISOString().split('T')[0],
  catatan_admin: '',
  items: [
    { 
      nama_barang: '', 
      qty_estimasi: 0, 
      satuan: '', 
      estimasi_susut: 0,
      harga_modal: 0,
      harga_jual: 0,
      total_modal: 0,
      total_jual: 0,
      profit: 0,
      margin: 0
    }
  ]
});

// Calculate totals
const summary = computed(() => {
  return formData.value.items.reduce((acc, item) => {
    acc.total_modal += item.total_modal || 0;
    acc.total_jual += item.total_jual || 0;
    acc.profit += item.profit || 0;
    return acc;
  }, { total_modal: 0, total_jual: 0, profit: 0 });
});

const totalMargin = computed(() => {
  if (summary.value.total_modal === 0) return 0;
  return (summary.value.profit / summary.value.total_modal) * 100;
});

// Calculation Logic
function calculateItem(item: any) {
  const qty = Number(item.qty_estimasi) || 0;
  const susut = Number(item.estimasi_susut) || 0;
  const modal = Number(item.harga_modal) || 0;
  const jual = Number(item.harga_jual) || 0;

  item.total_modal = qty * modal;
  const qtySiapJual = Math.max(0, qty - susut);
  item.total_jual = qtySiapJual * jual;
  item.profit = item.total_jual - item.total_modal;
  
  if (item.total_modal > 0) {
    item.margin = (item.profit / item.total_modal) * 100;
  } else {
    item.margin = 0;
  }
}

// Helpers
function formatNumber(value: number) {
  return Math.round(value).toLocaleString('id-ID');
}

function formatDecimal(value: number) {
  return value.toLocaleString('id-ID', { maximumFractionDigits: 1 });
}

// Currency formatting for input fields
function formatCurrency(value: number | string): string {
  if (!value && value !== 0) return '';
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/\D/g, '')) : value;
  if (isNaN(numValue)) return '';
  return numValue.toLocaleString('id-ID');
}

function parseCurrency(value: string): number {
  return parseFloat(value.replace(/\D/g, '')) || 0;
}

// Format input event handlers
function formatHargaModal(item: any, event: any) {
  const rawValue = parseCurrency(event.target.value);
  item.harga_modal = rawValue;
  event.target.value = formatCurrency(rawValue);
  calculateItem(item);
}

function formatHargaJual(item: any, event: any) {
  const rawValue = parseCurrency(event.target.value);
  item.harga_jual = rawValue;
  event.target.value = formatCurrency(rawValue);
  calculateItem(item);
}

function addItem() {
  formData.value.items.push({
    nama_barang: '',
    qty_estimasi: 0,
    satuan: '',
    estimasi_susut: 0,
    harga_modal: 0,
    harga_jual: 0,
    total_modal: 0,
    total_jual: 0,
    profit: 0,
    margin: 0
  });
}

function removeItem(index: number) {
  if (formData.value.items.length > 1) {
    formData.value.items.splice(index, 1);
  }
}

// Validation
function validateForm(): boolean {
  if (formData.value.items.length === 0) {
    alert('Minimal harus ada 1 item!');
    return false;
  }

  for (const item of formData.value.items) {
    if (!item.nama_barang.trim()) {
      alert('Nama barang tidak boleh kosong!');
      return false;
    }
    if (item.qty_estimasi <= 0) {
      alert('Quantity harus lebih dari 0!');
      return false;
    }
    if (!item.satuan) {
      alert('Satuan harus dipilih!');
      return false;
    }
    if (item.harga_modal <= 0) {
      alert('Harga modal harus lebih dari 0!');
      return false;
    }
  }

  return true;
}

// Save as Draft
async function saveDraft() {
  if (!validateForm()) return;

  loading.value = true;
  try {
    const payload = {
      ...formData.value,
      items: formData.value.items.map(item => ({
        nama_barang: item.nama_barang,
        qty_estimasi: item.qty_estimasi,
        satuan: item.satuan,
        harga_estimasi: item.harga_modal, // For backwards compatibility
        estimasi_susut: item.estimasi_susut,
        harga_modal: item.harga_modal,
        total_modal: item.total_modal,
        harga_jual: item.harga_jual,
        total_harga_jual: item.total_jual,
        profit: item.profit,
        margin: item.margin
      }))
    };

    const response = await api.post('/po', payload);
    if (response.data.success) {
      alert('✅ Penawaran berhasil disimpan sebagai DRAFT!\n\nAnda dapat mengedit atau menghapusnya sebelum mengajukan ke Manajer.');
      router.push('/po');
    }
  } catch (error: any) {
    console.error(error);
    alert('❌ ' + (error.response?.data?.message || 'Gagal menyimpan penawaran'));
  } finally {
    loading.value = false;
  }
}

// Submit for Approval
async function submitForApproval() {
  if (!validateForm()) return;

  loading.value = true;
  try {
    const payload = {
      ...formData.value,
      items: formData.value.items.map(item => ({
        nama_barang: item.nama_barang,
        qty_estimasi: item.qty_estimasi,
        satuan: item.satuan,
        harga_estimasi: item.harga_modal, // For backwards compatibility
        estimasi_susut: item.estimasi_susut,
        harga_modal: item.harga_modal,
        total_modal: item.total_modal,
        harga_jual: item.harga_jual,
        total_harga_jual: item.total_jual,
        profit: item.profit,
        margin: item.margin
      }))
    };

    const createResponse = await api.post('/po', payload);
    if (createResponse.data.success) {
      const poId = createResponse.data.data.po_id;
      const submitResponse = await api.post(`/po/${poId}/submit`);
      
      if (submitResponse.data.success) {
        alert('✅ Penawaran berhasil diajukan ke Manajer!\n\nStatus: MENUNGGU APPROVAL\n\nManajer akan mereview dan menyetujui penawaran Anda.');
        router.push('/po');
      }
    }
  } catch (error: any) {
    console.error(error);
    alert('❌ ' + (error.response?.data?.message || 'Gagal mengajukan penawaran'));
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="max-w-[1400px] mx-auto">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-3">
          <div class="flex-1">
            <h1 class="text-3xl font-bold text-slate-800 mb-2">📋 Buat Penawaran Harga PO</h1>
            <p class="text-slate-600 text-sm leading-relaxed">
              Buat penawaran harga untuk pengajuan Purchase Order. Setelah dibuat, ajukan ke Manajer untuk mendapatkan approval.
            </p>
          </div>
          <div class="flex items-center gap-2 bg-white px-4 py-2.5 rounded-lg border border-slate-200 shadow-sm">
             <span class="text-sm font-semibold text-slate-600">📅 Tanggal:</span>
             <input 
                v-model="formData.tanggal_po" 
                type="date" 
                required 
                class="text-sm font-bold text-slate-800 outline-none bg-transparent"
              />
          </div>
        </div>

        <!-- Workflow Progress Indicator -->
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
          <div class="flex items-center justify-between text-xs font-semibold overflow-x-auto">
            <div class="flex items-center gap-2 whitespace-nowrap">
              <div class="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">1</div>
              <span class="text-blue-700">Buat Penawaran</span>
            </div>
            <div class="flex-1 h-0.5 bg-slate-300 mx-2 min-w-[20px]"></div>
            <div class="flex items-center gap-2 whitespace-nowrap">
              <div class="w-7 h-7 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center">2</div>
              <span class="text-slate-500">Approval Manajer</span>
            </div>
            <div class="flex-1 h-0.5 bg-slate-300 mx-2 min-w-[20px]"></div>
            <div class="flex items-center gap-2 whitespace-nowrap">
              <div class="w-7 h-7 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center">3</div>
              <span class="text-slate-500">Transfer Dana</span>
            </div>
            <div class="flex-1 h-0.5 bg-slate-300 mx-2 min-w-[20px]"></div>
            <div class="flex items-center gap-2 whitespace-nowrap">
              <div class="w-7 h-7 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center">4</div>
              <span class="text-slate-500">Belanja</span>
            </div>
            <div class="flex-1 h-0.5 bg-slate-300 mx-2 min-w-[20px]"></div>
            <div class="flex items-center gap-2 whitespace-nowrap">
              <div class="w-7 h-7 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center">5</div>
              <span class="text-slate-500">Selesai</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-white p-5 rounded-xl border-2 border-blue-200 shadow-sm">
          <p class="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1.5">Total Modal</p>
          <div class="text-2xl font-bold text-blue-700">Rp {{ formatNumber(summary.total_modal) }}</div>
        </div>
        <div class="bg-white p-5 rounded-xl border-2 border-emerald-200 shadow-sm">
          <p class="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1.5">Target Omzet</p>
          <div class="text-2xl font-bold text-emerald-700">Rp {{ formatNumber(summary.total_jual) }}</div>
        </div>
        <div class="bg-white p-5 rounded-xl border-2 border-violet-200 shadow-sm">
           <div class="flex justify-between items-start">
              <div>
                <p class="text-xs font-bold text-violet-600 uppercase tracking-wider mb-1.5">Potensi Profit</p>
                <div class="text-2xl font-bold text-violet-700">Rp {{ formatNumber(summary.profit) }}</div>
              </div>
              <div class="text-right">
                <span class="block text-[10px] font-bold text-slate-500 uppercase">Margin</span>
                <span class="text-xl font-bold" :class="totalMargin >= 20 ? 'text-emerald-600' : 'text-amber-500'">{{ formatDecimal(totalMargin) }}%</span>
              </div>
           </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <form @submit.prevent="submitForApproval">
          <!-- Toolbar -->
          <div class="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
             <h3 class="font-bold text-slate-800 text-lg">📦 Rincian Item Penawaran</h3>
             <p class="text-xs text-slate-600 mt-1">Masukkan detail barang, harga modal, dan target harga jual</p>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
              <thead>
                <!-- Section Headers -->
                <tr class="bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-300">
                  <th colspan="4" class="px-3 py-2 text-xs font-bold text-slate-600 uppercase tracking-wider border-r border-slate-300">Detail Barang</th>
                  <th colspan="2" class="px-3 py-2 text-xs font-bold text-blue-700 uppercase tracking-wider border-r border-slate-300 bg-blue-50/50">💰 Modal</th>
                  <th colspan="2" class="px-3 py-2 text-xs font-bold text-emerald-700 uppercase tracking-wider border-r border-slate-300 bg-emerald-50/50">💵 Penjualan</th>
                  <th colspan="2" class="px-3 py-2 text-xs font-bold text-violet-700 uppercase tracking-wider bg-violet-50/50">📈 Profit</th>
                  <th class="px-2 py-2"></th>
                </tr>
                <!-- Column Headers -->
<tr class="bg-slate-100 text-slate-700 font-semibold border-b-2 border-slate-300 text-xs">
                  <th class="px-3 py-2.5 border-r border-slate-200 w-[25%]">Nama Item</th>
                  <th class="px-2 py-2.5 text-center border-r border-slate-200 w-[8%]">Qty</th>
                  <th class="px-2 py-2.5 text-center border-r border-slate-200 w-[8%]">Satuan</th>
                  <th class="px-2 py-2.5 text-center text-amber-700 border-r border-slate-300 w-[8%]" title="Estimasi susut/berkurang">Susut</th>
                  <th class="px-2 py-2.5 text-right text-blue-700 border-r border-slate-200 bg-blue-50/30 w-[15%]">Harga</th>
                  <th class="px-2 py-2.5 text-right text-blue-700 border-r border-slate-300 bg-blue-50/30 w-[15%]">Total</th>
                  <th class="px-2 py-2.5 text-right text-emerald-700 border-r border-slate-200 bg-emerald-50/30 w-[15%]">Harga</th>
                  <th class="px-2 py-2.5 text-right text-emerald-700 border-r border-slate-300 bg-emerald-50/30 w-[15%]">Total</th>
                  <th class="px-2 py-2.5 text-right text-violet-700 border-r border-slate-200 bg-violet-50/30 w-auto">Profit</th>
                  <th class="px-2 py-2.5 text-center text-violet-700 bg-violet-50/30 w-auto">%</th>
                  <th class="px-2 py-2.5 w-auto"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                <tr v-for="(item, index) in formData.items" :key="index" class="hover:bg-slate-50/50 transition-colors">
                  <!-- Nama Item -->
                  <td class="px-3 py-2.5 align-middle border-r border-slate-200">
                    <input 
                      v-model="item.nama_barang" 
                      class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-medium" 
                      placeholder="Nama barang..." 
                      required 
                    />
                  </td>
                  
                  <!-- Qty -->
                  <td class="px-2 py-2.5 align-middle border-r border-slate-200">
                    <input 
                      v-model.number="item.qty_estimasi" 
                      @input="calculateItem(item)" 
                      type="number" 
                      min="0.01" 
                      step="0.01"
                      class="w-full px-2 py-2 text-center border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-bold" 
                      required 
                      placeholder="1"
                    />
                  </td>
                  
                  <!-- Satuan -->
                  <td class="px-2 py-2.5 align-middle border-r border-slate-200">
                     <select 
                       v-model="item.satuan" 
                       class="w-full px-2 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white text-sm font-medium"
                       required
                     >
                        <option value="">-</option>
                        <option value="Kg">Kg</option>
                        <option value="Pcs">Pcs</option>
                        <option value="Box">Box</option>
                        <option value="Karung">Karung</option>
                        <option value="Liter">Liter</option>
                     </select>
                  </td>

                  <!-- Estimasi Susut -->
                  <td class="px-2 py-2.5 align-middle border-r border-slate-300">
                    <input 
                      v-model.number="item.estimasi_susut" 
                      @input="calculateItem(item)" 
                      type="number" 
                      min="0"
                      step="0.01"
                      class="w-full px-2 py-2 text-center border border-amber-300 bg-amber-50/50 text-amber-900 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-sm font-bold" 
                      placeholder="0" 
                    />
                  </td>

                  <!-- Harga Modal -->
                  <td class="px-2 py-2.5 align-middle border-r border-slate-200 bg-blue-50/30">
                     <input 
                       :value="formatCurrency(item.harga_modal)" 
                       @input="formatHargaModal(item, $event)" 
                       type="text" 
                       inputmode="numeric"
                       class="w-full px-3 py-2 text-right border-2 border-blue-300 bg-white text-blue-900 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-sm" 
                       placeholder="0" 
                       required
                     />
                  </td>

                  <!-- Total Modal (Readonly) -->
                  <td class="px-3 py-2.5 text-right border-r border-slate-300 align-middle bg-blue-50/50">
                    <div class="font-bold text-sm text-blue-900 bg-blue-100/50 px-2 py-1.5 rounded-md inline-block min-w-[80px]">{{ formatNumber(item.total_modal) }}</div>
                  </td>

                  <!-- Harga Jual -->
                  <td class="px-2 py-2.5 align-middle border-r border-slate-200 bg-emerald-50/30">
                     <input 
                       :value="formatCurrency(item.harga_jual)" 
                       @input="formatHargaJual(item, $event)" 
                       type="text" 
                       inputmode="numeric"
                       class="w-full px-3 py-2 text-right border-2 border-emerald-300 bg-white text-emerald-900 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold text-sm" 
                       placeholder="0" 
                     />
                  </td>

                  <!-- Total Jual (Readonly) -->
                  <td class="px-3 py-2.5 text-right border-r border-slate-300 align-middle bg-emerald-50/50">
                     <div class="font-bold text-sm text-emerald-900 bg-emerald-100/50 px-2 py-1.5 rounded-md inline-block min-w-[80px]">{{ formatNumber(item.total_jual) }}</div>
                  </td>

                  <!-- Profit (Readonly) -->
                  <td class="px-3 py-2.5 text-right border-r border-slate-200 align-middle bg-violet-50/40">
                    <div class="font-bold text-sm px-2 py-1.5 rounded-md inline-block min-w-[80px]" :class="item.profit >= 0 ? 'text-violet-900 bg-violet-100/50' : 'text-red-700 bg-red-100'">{{ formatNumber(item.profit) }}</div>
                  </td>

                  <!-- Persentase (Readonly) -->
                  <td class="px-2 py-2.5 text-center align-middle bg-violet-50/40">
                    <span class="text-xs font-bold px-2.5 py-1.5 rounded-lg" :class="item.margin >= 20 ? 'text-emerald-800 bg-emerald-200' : (item.margin > 0 ? 'text-amber-800 bg-amber-200' : 'text-red-700 bg-red-200')">{{ formatDecimal(item.margin) }}%</span>
                  </td>

                  <!-- Delete -->
                  <td class="px-2 py-2.5 text-center align-middle">
                    <button 
                      type="button" 
                      @click="removeItem(index)" 
                      class="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-md transition-colors" 
                      :disabled="formData.items.length === 1"
                      title="Hapus item"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Add Button -->
          <div class="p-3 bg-slate-50 border-t border-slate-200">
             <button 
               type="button" 
               @click="addItem" 
               class="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 font-bold hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Tambah Item Baru
             </button>
          </div>

          <!-- Bottom Actions -->
          <div class="p-5 bg-white border-t-2 border-slate-200 flex flex-col lg:flex-row gap-4 items-start rounded-b-xl">
             <div class="flex-1 w-full">
                <label class="block text-sm font-bold text-slate-700 mb-2">💬 Catatan Tambahan</label>
                <textarea 
                  v-model="formData.catatan_admin" 
                  rows="3" 
                  class="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm" 
                  placeholder="Tambahkan catatan atau informasi penting lainnya..."
                ></textarea>
             </div>
             <div class="flex flex-col sm:flex-row gap-3 self-end w-full lg:w-auto">
                <button 
                  type="button" 
                  @click="$router.back()" 
                  class="px-6 py-3 border-2 border-slate-300 rounded-lg text-slate-700 font-bold text-sm hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                  Batal
                </button>
                <button 
                  type="button"
                  @click="saveDraft" 
                  :disabled="loading" 
                  class="px-6 py-3 bg-slate-600 text-white rounded-lg font-bold text-sm hover:bg-slate-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                   <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                   <span v-if="!loading">Simpan Draft</span>
                   <span v-else class="flex items-center gap-2">
                     <span class="animate-spin">⏳</span> Menyimpan...
                   </span>
                </button>
                <button 
                  type="submit" 
                  :disabled="loading" 
                  class="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg font-bold text-sm hover:from-emerald-700 hover:to-green-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                   <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                   <span v-if="!loading">Ajukan ke Manajer</span>
                   <span v-else class="flex items-center gap-2">
                     <span class="animate-spin">⏳</span> Mengajukan...
                   </span>
                </button>
             </div>
          </div>
        </form>
      </div>
  </div>
</template>
