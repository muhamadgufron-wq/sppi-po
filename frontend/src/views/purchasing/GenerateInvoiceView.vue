<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../services/api';
import { FileText, Calendar, Building2, User, ChevronRight } from 'lucide-vue-next';
import Swal from 'sweetalert2';

const router = useRouter();

interface Dapur {
  id: number;
  kode_dapur: string;
  nama_dapur: string;
  pic_name?: string;
}

interface POPreview {
  id: number;
  po_number: string;
  tanggal_po: string;
  total_jual: number;
}

const dapurs = ref<Dapur[]>([]);
const selectedDapur = ref('');
const periodeStart = ref('');
const periodeEnd = ref('');
const upNama = ref('');
const poPreview = ref<POPreview[]>([]);
const loading = ref(false);
const generating = ref(false);

const totalPreview = computed(() => {
  return poPreview.value.reduce((sum, po) => sum + Number(po.total_jual), 0);
});

const selectedDapurData = computed(() => {
  return dapurs.value.find(d => d.id === Number(selectedDapur.value));
});

// Auto-populate UP when dapur is selected
watch(selectedDapur, (newVal) => {
  if (newVal) {
    const dapur = dapurs.value.find(d => d.id === Number(newVal));
    if (dapur?.pic_name) {
      upNama.value = dapur.pic_name;
    }
  } else {
    upNama.value = '';
  }
});

onMounted(async () => {
  await loadDapurs();
});

async function loadDapurs() {
  try {
    const response = await api.get('/dapur');
    if (response.data.success) {
      dapurs.value = response.data.data;
    }
  } catch (error) {
    console.error('Load dapurs error:', error);
  }
}

async function previewPOs() {
  if (!selectedDapur.value || !periodeStart.value || !periodeEnd.value) {
    Swal.fire({
      icon: 'warning',
      title: 'Data Tidak Lengkap',
      text: 'Pilih dapur dan periode terlebih dahulu',
      confirmButtonColor: '#10b981'
    });
    return;
  }

  loading.value = true;
  try {
    // Use new preview endpoint
    const response = await api.get('/invoices/preview', {
      params: {
        dapur_id: selectedDapur.value,
        periode_start: periodeStart.value,
        periode_end: periodeEnd.value
      }
    });

    if (response.data.success) {
      poPreview.value = response.data.data.map((po: any) => ({
        id: po.id,
        po_number: po.po_number,
        tanggal_po: po.tanggal_po,
        total_jual: po.total_jual
      }));

      if (poPreview.value.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'Tidak Ada Data',
          text: 'Tidak ada PO yang bisa di-invoice untuk periode ini',
          confirmButtonColor: '#10b981'
        });
      }
    }
  } catch (error: any) {
    console.error('Preview POs error:', error);
    Swal.fire({
      icon: 'error',
      title: 'Gagal Memuat Data',
      text: error.response?.data?.message || 'Gagal memuat preview PO',
      confirmButtonColor: '#10b981'
    });
  } finally {
    loading.value = false;
  }
}

async function generateInvoice() {
  if (!selectedDapur.value || !periodeStart.value || !periodeEnd.value) {
    Swal.fire({
      icon: 'warning',
      title: 'Data Tidak Lengkap',
      text: 'Lengkapi semua field yang diperlukan',
      confirmButtonColor: '#10b981'
    });
    return;
  }

  if (poPreview.value.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Tidak Ada Data',
      text: 'Tidak ada PO untuk di-invoice. Klik "Preview PO" terlebih dahulu',
      confirmButtonColor: '#10b981'
    });
    return;
  }

  const result = await Swal.fire({
    title: 'Generate Invoice?',
    html: `
      <div class="text-left bg-emerald-50 p-4 rounded-lg border border-emerald-200 mb-2">
        <p class="text-sm text-slate-500 mb-1">Total PO:</p>
        <p class="text-2xl font-bold text-emerald-600">${poPreview.value.length} PO</p>
        <p class="text-xs text-slate-400 mt-1">Total Tagihan: Rp ${formatCurrency(totalPreview.value)}</p>
      </div>
      <p class="text-sm text-slate-500">Invoice akan dibuat dengan status DRAFT</p>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#10b981',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Ya, Generate!',
    cancelButtonText: 'Batal'
  });

  if (!result.isConfirmed) return;

  generating.value = true;
  try {
    const response = await api.post('/invoices/generate', {
      dapur_id: selectedDapur.value,
      periode_start: periodeStart.value,
      periode_end: periodeEnd.value,
      up_nama: upNama.value || null
    });

    if (response.data.success) {
      const invoiceData = response.data.data;
      await Swal.fire({
        icon: 'success',
        title: 'Invoice Berhasil Dibuat!',
        html: `
          <p class="text-lg font-bold text-emerald-600 mb-2">${invoiceData.invoice_number}</p>
          <p class="text-sm text-slate-500">Invoice telah dibuat dengan status DRAFT</p>
        `,
        confirmButtonColor: '#10b981',
        confirmButtonText: 'Lihat Detail'
      });
      
      // Redirect to detail page to download PDF
      router.push(`/invoices/${invoiceData.invoice_id}`);
    }
  } catch (error: any) {
    console.error('Generate invoice error:', error);
    Swal.fire({
      icon: 'error',
      title: 'Gagal Generate Invoice',
      text: error.response?.data?.message || 'Gagal generate invoice',
      confirmButtonColor: '#10b981'
    });
  } finally {
    generating.value = false;
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatCurrency(amount: number) {
  return Math.round(amount).toLocaleString('id-ID');
}
</script>

<template>
  <div class="max-w-[1400px] mx-auto">
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-2 text-sm mb-4">
      <button 
        @click="router.push('/invoices')"
        class="text-slate-500 hover:text-emerald-600 font-medium transition-colors"
      >
        Invoice
      </button>
      <ChevronRight class="w-4 h-4 text-slate-300" />
      <span class="text-slate-800 font-bold">Buat Invoice</span>
    </nav>

    <!-- Header -->
    <div class="mb-6">
      <h1 class="m-0 text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Buat Invoice</h1>
      <p class="m-0 mt-1 text-slate-500 font-medium">Buat invoice baru dari PO yang sudah selesai</p>
    </div>

    <!-- Form Card -->
    <div class="bg-gradient-to-br from-white to-emerald-50/30 rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-emerald-100 p-5 md:p-6 mb-5">
      <div class="flex items-center gap-3 mb-5">
        <div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Calendar class="w-5 h-5 text-emerald-600" />
        </div>
        <h3 class="m-0 text-lg font-bold text-slate-800">Informasi Invoice</h3>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Dapur -->
        <div>
          <label class="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
            <Building2 class="w-4 h-4 text-emerald-600" />
            Dapur *
          </label>
          <select 
            v-model="selectedDapur"
            class="w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
            required
          >
            <option value="">Pilih Dapur</option>
            <option v-for="dapur in dapurs" :key="dapur.id" :value="dapur.id">
              {{ dapur.nama_dapur }} ({{ dapur.kode_dapur }})
            </option>
          </select>
          <p v-if="selectedDapurData?.pic_name" class="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
            <User class="w-3.5 h-3.5" />
            PIC: {{ selectedDapurData.pic_name }}
          </p>
        </div>

        <!-- UP Nama (Auto-populated from PIC) -->
        <div>
          <label class="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
            <User class="w-4 h-4 text-emerald-600" />
            UP (Unit Penerima)
          </label>
          <input 
            v-model="upNama"
            type="text"
            placeholder="Otomatis terisi dari PIC dapur"
            class="w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
            :class="{ 'bg-emerald-50/50 border-emerald-200': upNama }"
          />
          <p class="mt-2 text-xs text-slate-500">Terisi otomatis, bisa diubah</p>
        </div>

        <!-- Periode Start -->
        <div>
          <label class="block text-sm font-bold text-slate-700 mb-2">Periode Mulai *</label>
          <input 
            v-model="periodeStart"
            type="date"
            class="w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
            required
          />
        </div>

        <!-- Periode End -->
        <div>
          <label class="block text-sm font-bold text-slate-700 mb-2">Periode Selesai *</label>
          <input 
            v-model="periodeEnd"
            type="date"
            class="w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
            required
          />
        </div>
      </div>

      <!-- Preview Button -->
      <div class="mt-5 flex gap-3">
        <button 
          @click="previewPOs"
          :disabled="loading"
          class="flex-1 px-5 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-xl text-sm font-bold transition-all hover:from-slate-700 hover:to-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
        >
          <FileText class="w-4 h-4" />
          {{ loading ? 'Memuat...' : 'Preview PO' }}
        </button>
      </div>
    </div>

    <!-- PO Preview -->
    <div v-if="poPreview.length > 0" class="bg-white rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-slate-200 overflow-hidden mb-5">
      <div class="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
            <FileText class="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 class="m-0 text-lg font-bold text-slate-800">Preview PO</h3>
            <p class="m-0 text-sm text-slate-600">{{ poPreview.length }} PO siap di-invoice</p>
          </div>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-slate-50/80">
              <th class="p-4 text-left font-bold text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200">No</th>
              <th class="p-4 text-left font-bold text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200">No. PO</th>
              <th class="p-4 text-center font-bold text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200">Tanggal PO</th>
              <th class="p-4 text-right font-bold text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200">Nominal</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="(po, index) in poPreview" 
              :key="po.id"
              class="hover:bg-emerald-50/30 border-b border-slate-100 last:border-0 transition-colors"
            >
              <td class="p-4 text-slate-600">{{ index + 1 }}</td>
              <td class="p-4">
                <span class="font-bold text-slate-800">{{ po.po_number }}</span>
              </td>
              <td class="p-4 text-center text-slate-600">{{ formatDate(po.tanggal_po) }}</td>
              <td class="p-4 text-right font-bold text-emerald-700">Rp {{ formatCurrency(po.total_jual) }}</td>
            </tr>
          </tbody>
          <tfoot class="border-t-2 border-slate-200 bg-slate-50">
            <tr>
              <td colspan="3" class="p-4 text-right font-bold text-slate-700 uppercase text-sm">Total Tagihan</td>
              <td class="p-4 text-right font-bold text-emerald-700 text-lg">Rp {{ formatCurrency(totalPreview) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Generate Button -->
      <div class="p-5 border-t border-slate-100 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
        <button 
          @click="generateInvoice"
          :disabled="generating"
          class="w-full px-5 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-bold transition-all hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <FileText class="w-5 h-5" />
          {{ generating ? 'Generating...' : 'Generate Invoice' }}
        </button>
      </div>
    </div>

    <div v-else-if="!loading" class="bg-white rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-slate-200 p-12 text-center">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
        <FileText class="w-8 h-8 text-slate-300" />
      </div>
      <p class="text-slate-400 text-sm font-medium">Klik "Preview PO" untuk melihat PO yang akan dibuatkan invoice</p>
    </div>
  </div>
</template>
