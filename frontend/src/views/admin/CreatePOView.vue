
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { 
  FilePlus, 
  Calendar, 
  Building2, 
  Save, 
  Send, 
  ArrowLeft, 
  Trash2, 
  PlusCircle, 
  DollarSign, 
  TrendingUp, 
  Percent,
} from 'lucide-vue-next';
import Swal from 'sweetalert2';
import api from '../../services/api';

const router = useRouter();
const loading = ref(false);
const dapurs = ref<any[]>([]);

async function loadDapurs() {
  try {
    const response = await api.get('/dapur?all=true'); // Filter active in backend or here? API defaults to all usually, component filters status
    // Filter only active dapurs for dropdown
    dapurs.value = response.data.data.filter((d: any) => d.is_active);
  } catch (error) {
    console.error('Failed to load dapurs:', error);
  }
}

onMounted(() => {
  loadDapurs();
});

const formData = ref({
  tanggal_po: new Date().toISOString().split('T')[0],
  dapur_id: '',
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
    Swal.fire('Error', 'Minimal harus ada 1 item!', 'error');
    return false;
  }

  if (!formData.value.dapur_id) {
    Swal.fire({
       icon: 'warning',
       title: 'Dapur Belum Dipilih',
       text: 'Mohon pilih dapur tujuan terlebih dahulu!',
       confirmButtonColor: '#f59e0b'
    });
    return false;
  }

  for (const item of formData.value.items) {
    if (!item.nama_barang.trim()) {
      Swal.fire('Items Incomplete', 'Nama barang tidak boleh kosong!', 'warning');
      return false;
    }
    if (item.qty_estimasi <= 0) {
      Swal.fire('Items Incomplete', 'Quantity harus lebih dari 0!', 'warning');
      return false;
    }
    if (!item.satuan) {
      Swal.fire('Items Incomplete', 'Satuan harus dipilih!', 'warning');
      return false;
    }
    if (item.harga_modal <= 0) {
      Swal.fire('Items Incomplete', 'Harga modal harus lebih dari 0!', 'warning');
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
      await Swal.fire({
         icon: 'success',
         title: 'Draft Disimpan!',
         text: 'Penawaran berhasil disimpan sebagai draft.',
         confirmButtonColor: '#10b981'
      });
      router.push('/po');
    }
  } catch (error: any) {
    console.error(error);
    Swal.fire({
      icon: 'error',
      title: 'Gagal Menyimpan',
      text: error.response?.data?.message || 'Gagal menyimpan penawaran',
      confirmButtonColor: '#ef4444'
    });
  } finally {
    loading.value = false;
  }
}

// Submit for Approval
async function submitForApproval() {
  if (!validateForm()) return;

  const confirm = await Swal.fire({
    title: 'Ajukan ke Manajer?',
    text: "PO akan dikirim untuk approval Manajer.",
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#10b981',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Ya, Ajukan!',
    cancelButtonText: 'Batal'
  });

  if (!confirm.isConfirmed) return;

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
        await Swal.fire({
          icon: 'success',
          title: 'Berhasil Diajukan!',
          text: 'Penawaran telah dikirim ke Manajer.',
          confirmButtonColor: '#10b981'
        });
        router.push('/po');
      }
    }
  } catch (error: any) {
    console.error(error);
    Swal.fire({
      icon: 'error',
      title: 'Gagal Mengajukan',
      text: error.response?.data?.message || 'Gagal mengajukan penawaran',
      confirmButtonColor: '#ef4444'
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="max-w-[1400px] mx-auto animate-[fadeIn_0.5s_ease-out]">
      <!-- Header Section -->
      <div class="mb-8">
        <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-6">
          <div>
            <h1 class="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-2 mb-2">
              <FilePlus class="w-8 h-8 text-emerald-600" />
              Buat PO Baru
            </h1>
            <p class="text-slate-500 font-medium">
              Isi formulir di bawah untuk membuat pengajuan Purchase Order baru.
            </p>
          </div>
          
          <!-- Key Meta Fields -->
          <div class="flex flex-col sm:flex-row gap-3">
             <div class="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
               <div class="p-2 bg-blue-50 text-blue-600 rounded-lg">
                 <Calendar class="w-5 h-5" />
               </div>
               <div>
                 <span class="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tanggal PO</span>
                 <input 
                    v-model="formData.tanggal_po" 
                    type="date" 
                    required 
                    class="text-sm font-bold text-slate-800 outline-none bg-transparent cursor-pointer focus:ring-2 focus:ring-blue-500/20 rounded"
                  />
               </div>
             </div>
             
             <div class="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
               <div class="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                 <Building2 class="w-5 h-5" />
               </div>
               <div>
                  <span class="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Dapur Tujuan <span class="text-red-500">*</span></span>
                  <select 
                    v-model="formData.dapur_id" 
                    required 
                    class="text-sm font-bold text-slate-800 outline-none bg-transparent min-w-[180px] cursor-pointer focus:ring-2 focus:ring-emerald-500/20 rounded appearance-none"
                  >
                    <option value="" disabled>-- Pilih Dapur --</option>
                    <option v-for="dapur in dapurs" :key="dapur.id" :value="dapur.id">
                      {{ dapur.nama_dapur }}
                    </option>
                  </select>
               </div>
             </div>
          </div>
        </div>
      </div>
      <!-- Financial Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <!-- Total Modal -->
        <div class="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 relative overflow-hidden group">
          <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign class="w-24 h-24" />
          </div>
          <div class="relative z-10">
            <p class="text-indigo-100 text-sm font-medium mb-1 flex items-center gap-2">
              Total Modal Estimasi
            </p>
            <h3 class="text-3xl font-bold tracking-tight">Rp {{ formatNumber(summary.total_modal) }}</h3>
          </div>
        </div>

        <!-- Target Omzet -->
        <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] relative overflow-hidden group">
          <div class="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full group-hover:bg-emerald-100 transition-colors"></div>
          <div class="relative z-10">
             <p class="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
               <TrendingUp class="w-4 h-4 text-emerald-500" /> Target Jual
             </p>
             <h3 class="text-2xl font-bold text-slate-800">Rp {{ formatNumber(summary.total_jual) }}</h3>
          </div>
        </div>

        <!-- Profit Analysis -->
        <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] relative overflow-hidden">
           <div class="flex justify-between items-end">
             <div>
               <p class="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                 <Percent class="w-4 h-4 text-violet-500" /> Potensi Profit
               </p>
               <h3 class="text-2xl font-bold text-violet-600">Rp {{ formatNumber(summary.profit) }}</h3>
             </div>
             <div class="text-right">
               <span class="text-xs text-slate-400 font-medium mb-1 block">Margin</span>
               <span class="text-lg font-bold px-3 py-1 rounded-lg" :class="totalMargin >= 20 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">
                 {{ formatDecimal(totalMargin) }}%
               </span>
             </div>
           </div>
        </div>
      </div>

      <!-- Main Form Area -->
      <div class="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden mb-12">
        <form @submit.prevent="submitForApproval">
          
          <!-- Table Toolbar -->
          <div class="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
             <div>
               <h3 class="font-bold text-slate-800 text-lg">Rincian Barang</h3>
               <p class="text-xs text-slate-500 mt-0.5">Input detail item, harga modal, dan target jual.</p>
             </div>
          </div>

          <!-- Data Grid -->
          <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-bold">
                  <th class="px-4 py-4 w-[20%] pl-6">Nama Barang</th>
                  <th class="px-2 py-4 text-center w-[7%]">Qty</th>
                  <th class="px-2 py-4 text-center w-[8%]">Satuan</th>
                  <th class="px-2 py-4 text-center w-[7%] text-amber-600" title="Estimasi susut/rusak">Susut</th>
                  <th class="px-2 py-4 text-right w-[11%] text-indigo-600">Harga Modal</th>
                  <th class="px-2 py-4 text-right w-[11%] text-indigo-600">Total Modal</th>
                  <th class="px-2 py-4 text-right w-[11%] text-emerald-600">Harga Jual</th>
                  <th class="px-2 py-4 text-right w-[11%] text-emerald-600">Total Jual</th>
                  <th class="px-2 py-4 text-right w-[9%] text-violet-600">Profit</th>
                  <th class="px-2 py-4 text-center w-[5%] text-violet-600">%</th>
                  <th class="px-4 py-4 text-center w-[4%] pr-6"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="(item, index) in formData.items" :key="index" class="group hover:bg-slate-50/50 transition-colors">
                  <!-- Nama Barang -->
                  <td class="px-4 py-3 pl-6 align-middle">
                    <input 
                      v-model="item.nama_barang" 
                      class="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none text-sm font-semibold text-slate-700 transition-all placeholder:font-normal" 
                      placeholder="Nama barang..." 
                      required 
                    />
                  </td>
                  
                  <!-- Qty -->
                  <td class="px-2 py-3 align-middle">
                    <input 
                      v-model.number="item.qty_estimasi" 
                      @input="calculateItem(item)" 
                      type="number" 
                      min="0.01" 
                      step="0.01"
                      class="w-full px-2 py-2.5 text-center bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none text-sm font-bold text-slate-700" 
                      required 
                      placeholder="0"
                    />
                  </td>
                  
                  <!-- Satuan -->
                  <td class="px-2 py-3 align-middle">
                     <select 
                       v-model="item.satuan" 
                       class="w-full px-2 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none text-sm font-medium text-slate-600 cursor-pointer"
                       required
                     >
                        <option value="">Pilih</option>
                        <option value="Kg">Kg</option>
                        <option value="Pcs">Pcs</option>
                        <option value="Box">Box</option>
                        <option value="Karung">Karung</option>
                        <option value="Liter">Liter</option>
                        <option value="Ikat">Ikat</option>
                     </select>
                  </td>

                  <!-- Susut -->
                  <td class="px-2 py-3 align-middle">
                    <input 
                      v-model.number="item.estimasi_susut" 
                      @input="calculateItem(item)" 
                      type="number" 
                      min="0"
                      step="0.01"
                      class="w-full px-2 py-2.5 text-center bg-amber-50 border border-amber-200 text-amber-900 rounded-xl focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none text-sm font-bold placeholder:text-amber-300" 
                      placeholder="0" 
                    />
                  </td>

                  <!-- Harga Modal -->
                  <td class="px-2 py-3 align-middle">
                     <div class="relative">
                       <input 
                         :value="formatCurrency(item.harga_modal)" 
                         @input="formatHargaModal(item, $event)" 
                         type="text" 
                         inputmode="numeric"
                         class="w-full px-3 py-2.5 text-right bg-indigo-50/30 border border-indigo-100 text-indigo-900 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none font-bold text-sm" 
                         placeholder="0" 
                         required
                       />
                     </div>
                  </td>

                  <!-- Total Modal (Readonly) -->
                  <td class="px-2 py-3 align-middle text-right">
                    <span class="font-bold text-sm text-indigo-700 block bg-indigo-50/50 py-2.5 px-3 rounded-xl border border-indigo-100/50">{{ formatNumber(item.total_modal) }}</span>
                  </td>

                  <!-- Harga Jual -->
                  <td class="px-2 py-3 align-middle">
                      <div class="relative">
                       <input 
                         :value="formatCurrency(item.harga_jual)" 
                         @input="formatHargaJual(item, $event)" 
                         type="text" 
                         inputmode="numeric"
                         class="w-full px-3 py-2.5 text-right bg-emerald-50/30 border border-emerald-100 text-emerald-900 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none font-bold text-sm" 
                         placeholder="0" 
                       />
                     </div>
                  </td>

                  <!-- Total Jual (Readonly) -->
                  <td class="px-2 py-3 align-middle text-right">
                     <span class="font-bold text-sm text-emerald-700 block bg-emerald-50/50 py-2.5 px-3 rounded-xl border border-emerald-100/50">{{ formatNumber(item.total_jual) }}</span>
                  </td>

                  <!-- Profit Amount -->
                  <td class="px-2 py-3 align-middle text-right">
                     <span class="font-bold text-sm block py-1.5 px-2 rounded-lg w-full" 
                           :class="item.profit >= 0 ? 'text-violet-700 bg-violet-50 border border-violet-100' : 'text-red-600 bg-red-50 border border-red-100'">
                       {{ formatNumber(item.profit) }}
                     </span>
                  </td>

                  <!-- Profit Margin (%) -->
                  <td class="px-2 py-3 align-middle text-center">
                    <span class="text-xs font-bold block" :class="item.margin >= 20 ? 'text-emerald-600' : (item.margin > 0 ? 'text-amber-600' : 'text-slate-400')">
                      {{ formatDecimal(item.margin) }}%
                    </span>
                  </td>

                  <!-- Delete -->
                  <td class="px-4 py-3 align-middle text-center pr-6">
                    <button 
                      type="button" 
                      @click="removeItem(index)" 
                      class="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all" 
                      :disabled="formData.items.length === 1"
                      title="Hapus baris"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Add Button (Bottom) -->
          <div class="p-3 bg-slate-50 border-t border-slate-100 flex justify-center">
             <button 
               type="button" 
               @click="addItem" 
               class="px-6 py-2 text-slate-500 hover:text-emerald-600 font-bold text-sm flex items-center gap-2 transition-colors"
             >
                <PlusCircle class="w-4 h-4" />
                Tambah Barang Lainnya
             </button>
          </div>

          <!-- Footer Actions & Notes -->
          <div class="p-6 bg-white border-t border-slate-100 flex flex-col lg:flex-row gap-8 items-start">
             <div class="flex-1 w-full">
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Catatan Admin</label>
                <textarea 
                  v-model="formData.catatan_admin" 
                  rows="3" 
                  class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none text-sm transition-all" 
                  placeholder="Tambahkan catatan khusus untuk manajer atau tim lapangan..."
                ></textarea>
             </div>
             
             <div class="flex flex-col sm:flex-row gap-3 self-end w-full lg:w-auto">
                <button 
                  type="button" 
                  @click="$router.back()" 
                  class="px-6 py-3.5 border border-slate-200 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50 hover:text-slate-800 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <ArrowLeft class="w-4 h-4" />
                  Batal
                </button>
                <button 
                  type="button"
                  @click="saveDraft" 
                  :disabled="loading" 
                  class="px-6 py-3.5 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-900 shadow-lg shadow-slate-200 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                   <Save class="w-4 h-4" />
                   <span v-if="!loading">Simpan Draft</span>
                   <span v-else>Menyimpan...</span>
                </button>
                <button 
                  type="submit" 
                  :disabled="loading" 
                  class="px-8 py-3.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-200 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed min-w-[180px]"
                >
                   <Send class="w-4 h-4" />
                   <span v-if="!loading">Ajukan Penawaran</span>
                   <span v-else>Memproses...</span>
                </button>
             </div>
          </div>
        </form>
      </div>
  </div>
</template>
