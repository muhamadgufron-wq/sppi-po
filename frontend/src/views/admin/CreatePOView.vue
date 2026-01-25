
<script setup lang="ts">
import { ref, computed } from 'vue';
import api from '../../services/api';

const loading = ref(false);

const formData = ref({
  tanggal_po: new Date().toISOString().split('T')[0],
  catatan_admin: '',
  items: [
    { nama_barang: '', qty_estimasi: 0, satuan: '', harga_estimasi: 0 }
  ]
});

// Computed property for total estimasi
const totalEstimasi = computed(() => {
  return formData.value.items.reduce((total, item) => {
    return total + getSubtotal(item);
  }, 0);
});

// Get subtotal for an item
function getSubtotal(item: any) {
  const qty = Number(item.qty_estimasi) || 0;
  const harga = Number(item.harga_estimasi) || 0;
  return qty * harga;
}

// Calculate subtotal (called on input change)
function calculateSubtotal() {
  // This function is called to trigger reactivity
  // The actual calculation is done in getSubtotal
}

// Format price input with thousand separators
function formatPriceInput(value: number): string {
  if (!value || value === 0) return '';
  return Math.round(value).toLocaleString('id-ID');
}

// Parse price input from formatted string to number
function parsePriceInput(value: string): number {
  if (!value) return 0;
  // Remove all dots (thousand separators)
  const cleaned = value.replace(/\./g, '');
  return parseInt(cleaned) || 0;
}

// Update price from input
function updatePrice(item: any, event: Event) {
  const input = event.target as HTMLInputElement;
  const rawValue = input.value;
  
  // Parse the formatted value to number
  const numericValue = parsePriceInput(rawValue);
  
  // Update the item's price
  item.harga_estimasi = numericValue;
  
  // Format the input value
  const formatted = formatPriceInput(numericValue);
  input.value = formatted;
}

// Format currency for display
function formatCurrency(amount: number) {
  return Math.round(amount).toLocaleString('id-ID');
}

function addItem() {
  formData.value.items.push({
    nama_barang: '',
    qty_estimasi: 0,
    satuan: '',
    harga_estimasi: 0
  });
}

function removeItem(index: number) {
  if (formData.value.items.length > 1) {
    formData.value.items.splice(index, 1);
  }
}

async function handleSubmit() {
  loading.value = true;
  try {
    const response = await api.post('/po', formData.value);
    if (response.data.success) {
      alert('PO created successfully!');
      // Reset form instead of redirecting
      formData.value = {
        tanggal_po: new Date().toISOString().split('T')[0],
        catatan_admin: '',
        items: [
          { nama_barang: '', qty_estimasi: 0, satuan: '', harga_estimasi: 0 }
        ]
      };
    }
  } catch (error: any) {
    alert(error.response?.data?.message || 'Failed to create PO');
  } finally {
    loading.value = false;
  }
}
</script>


<template>
  <div class="max-w-[1200px] mx-auto">
      <!-- Header -->
      <div class="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="m-0 text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Buat Purchase Order</h1>
          <p class="m-0 mt-1 text-slate-500 font-medium">Buat pengajuan PO baru untuk supplier sayuran.</p>
        </div>
      </div>

      <div class="bg-white p-4 md:p-6 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-emerald-50">
        
        <form @submit.prevent="handleSubmit">
          <div class="mb-6">
            <label class="block mb-2 font-bold text-sm text-slate-700">Tanggal PO</label>
            <input 
              v-model="formData.tanggal_po" 
              type="date" 
              required 
              class="w-full md:w-1/3 px-4 py-2 border border-slate-200 rounded-xl text-sm transition-all focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 font-bold text-slate-700"
            />
          </div>

          <div class="my-8">
            <div class="flex justify-between items-center mb-5">
              <h3 class="m-0 text-lg font-bold text-slate-800 flex items-center gap-2">
                <span class="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                Daftar Item
              </h3>
            </div>

            <!-- Table Header with Grouped Columns -->
            <div class="border border-slate-200 rounded-t-xl bg-slate-50/50 overflow-hidden">
              <!-- First Row - Main Headers -->
              <div class="grid grid-cols-1 md:grid-cols-[2.5fr_0.8fr_0.8fr_2.4fr_60px] gap-3 p-4 bg-slate-50 font-bold text-[12px] text-slate-500 uppercase tracking-widest">
                <div class="md:col-start-1">Item Details</div>
                <div class="md:col-start-2 text-right">Qty</div>
                <div class="md:col-start-3">Satuan</div>
                <div class="text-center bg-emerald-100/50 text-emerald-700 p-2 rounded-lg font-bold tracking-wider md:col-start-4 md:col-end-5 border border-emerald-100">Harga Estimasi</div>
                <div class="flex justify-center md:col-start-5"></div>
              </div>
            </div>

            <!-- Item Rows -->
            <div class="border border-t-0 border-slate-200 rounded-b-xl bg-white">
              <div v-for="(item, index) in formData.items" :key="index" class="grid grid-cols-1 md:grid-cols-[2.5fr_0.8fr_0.8fr_1.2fr_1.2fr_60px] gap-3 p-4 items-center border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                
                <!-- Nama Item -->
                <div class="md:col-start-1">
                   <input 
                    v-model="item.nama_barang" 
                    class="m-0 p-3 px-4 text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none w-full font-semibold text-slate-700 placeholder:text-slate-400"
                    placeholder="Nama Sayuran / Barang" 
                    required 
                  />
                </div>

                <!-- Qty -->
                <div class="md:col-start-2">
                   <input 
                    v-model.number="item.qty_estimasi" 
                    class="text-right m-0 p-3 px-4 text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none w-full font-semibold text-slate-700"
                    type="number" 
                    step="1" 
                    min="0"
                    placeholder="0" 
                    required 
                    @input="calculateSubtotal()"
                  />
                </div>

                <!-- Satuan -->
                <div class="md:col-start-3 relative w-full">
                  <select 
                    v-model="item.satuan" 
                    class="w-full m-0 p-3 px-4 pr-10 text-sm border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none bg-white appearance-none cursor-pointer transition-all hover:border-emerald-400 font-semibold text-slate-700"
                    required
                  >
                    <option value="" disabled selected>Satuan</option>
                    <option value="Kg">Kg</option>
                    <option value="Pcs">Pcs</option>
                    <option value="Dus">Dus</option>
                    <option value="Ikat">Ikat</option>
                    <option value="Karung">Karung</option>
                  </select>
                  <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-emerald-600">
                    <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                  </div>
                </div>

                <!-- Harga Satuan -->
                <div class="md:col-start-4">
                  <div class="relative">
                    <span class="absolute left-3 top-3 text-slate-400 text-sm font-semibold">Rp</span>
                    <input 
                      :value="formatPriceInput(item.harga_estimasi)"
                      @input="updatePrice(item, $event)"
                      class="text-right m-0 p-3 px-4 pl-10 text-sm rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none w-full font-semibold text-slate-700"
                      type="text" 
                      placeholder="0" 
                      required 
                    />
                  </div>
                </div>

                <!-- Subtotal Readonly -->
                <div class="md:col-start-5 p-3 px-4 bg-emerald-50/50 rounded-xl font-bold text-sm text-emerald-700 text-right border border-emerald-100/50">
                  Rp {{ formatCurrency(getSubtotal(item)) }}
                </div>

                <!-- Delete Action -->
                <div class="md:col-start-6 flex justify-center">
                  <button 
                    type="button" 
                    @click="removeItem(index)" 
                    class="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    :disabled="formData.items.length === 1"
                  >
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Add Item Button -->
            <button type="button" @click="addItem" class="mt-4 w-full py-4 border-2 border-dashed border-emerald-200 rounded-xl text-emerald-600 font-bold hover:bg-emerald-50 hover:border-emerald-300 transition-all flex items-center justify-center gap-2 group">
              <span class="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">+</span>
              Tambah Item
            </button>

            <!-- Total Row -->
            <div class="flex flex-col items-end mt-8 pt-6 border-t border-slate-100">
              <div class="flex items-center gap-8">
                <span class="text-slate-500 font-semibold">Total Estimasi</span>
                <span class="text-3xl font-extrabold text-slate-800 tracking-tight">Rp <span class="text-emerald-600">{{ formatCurrency(totalEstimasi) }}</span></span>
              </div>
            </div>
          </div>

          <!-- Catatan Admin (Moved to bottom) -->
          <div class="mb-8">
            <label class="block mb-2 font-bold text-sm text-slate-700">Catatan Admin</label>
            <textarea 
              v-model="formData.catatan_admin" 
              rows="3" 
              placeholder="Tambahkan catatan untuk detail pengajuan..." 
              class="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm transition-all focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 resize-y font-medium text-slate-700"
            ></textarea>
          </div>

          <div class="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button 
              type="button"
              @click="$router.back()"
              class="px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
            >
              Batal
            </button>
            <button 
              type="submit" 
              :disabled="loading" 
              class="px-8 py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg v-if="loading" class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              {{ loading ? 'Memproses...' : 'Buat Purchase Order' }}
            </button>
          </div>
        </form>
      </div>
  </div>
</template>
