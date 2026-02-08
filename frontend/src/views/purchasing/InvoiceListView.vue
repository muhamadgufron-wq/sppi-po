<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../services/api';
import { FileText, Plus, Eye } from 'lucide-vue-next';

const router = useRouter();

interface Invoice {
  id: number;
  invoice_number: string;
  dapur_id: number;
  tanggal_invoice: string;
  periode_start: string;
  periode_end: string;
  total_amount: number;
  sisa_tagihan: number;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';
  nama_dapur?: string;
  kode_dapur?: string;
  created_by_name?: string;
  created_at: string;
}

const invoices = ref<Invoice[]>([]);
const loading = ref(false);
const filterStatus = ref('');

onMounted(() => {
  loadInvoices();
});

async function loadInvoices() {
  loading.value = true;
  try {
    const params: any = {};
    if (filterStatus.value) {
      params.status = filterStatus.value;
    }

    const response = await api.get('/invoices', { params });
    if (response.data.success) {
      invoices.value = response.data.data;
    }
  } catch (error) {
    console.error('Load invoices error:', error);
    alert('Gagal memuat data invoice');
  } finally {
    loading.value = false;
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

function getStatusClass(status: string) {
  const map: Record<string, string> = {
    'DRAFT': 'bg-slate-50 text-slate-700 border-slate-200',
    'ISSUED': 'bg-blue-50 text-blue-700 border-blue-200',
    'PAID': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'CANCELLED': 'bg-red-50 text-red-700 border-red-200'
  };
  return map[status] || 'bg-slate-50 text-slate-700 border-slate-200';
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    'DRAFT': 'Draft',
    'ISSUED': 'Terbit',
    'PAID': 'Lunas',
    'CANCELLED': 'Batal'
  };
  return map[status] || status;
}

function viewInvoice(id: number) {
  router.push(`/invoices/${id}`);
}
</script>

<template>
  <div class="max-w-[1400px] mx-auto">
    <!-- Header -->
    <div class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="m-0 text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Invoice</h1>
        <p class="m-0 mt-2 text-slate-500 font-medium">Kelola invoice untuk dapur</p>
      </div>
      
      <button 
        @click="router.push('/invoices/generate')"
        class="px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold transition-all hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center gap-2 w-fit"
      >
        <Plus class="w-4 h-4" />
        Buat Invoice
      </button>
    </div>

    <!-- Filter -->
    <div class="mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <div class="flex items-center gap-4">
        <label class="text-sm font-bold text-slate-600">Filter Status:</label>
        <select 
          v-model="filterStatus" 
          @change="loadInvoices"
          class="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Semua Status</option>
          <option value="DRAFT">Draft</option>
          <option value="ISSUED">Terbit</option>
          <option value="PAID">Lunas</option>
          <option value="CANCELLED">Batal</option>
        </select>
      </div>
    </div>

    <!-- Invoice List -->
    <div class="bg-white rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-emerald-50 overflow-hidden">
      <div v-if="loading" class="text-center py-16 text-slate-500">
        Memuat data...
      </div>

      <div v-else-if="invoices.length === 0" class="text-center py-16 text-slate-400">
        <FileText class="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <p class="text-sm">Belum ada invoice</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="bg-slate-50/80">
              <th class="p-4 text-left font-bold text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200">No. Invoice</th>
              <th class="p-4 text-left font-bold text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200">Dapur</th>
              <th class="p-4 text-center font-bold text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200">Tanggal</th>
              <th class="p-4 text-center font-bold text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200">Periode</th>
              <th class="p-4 text-right font-bold text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200">Total</th>
              <th class="p-4 text-center font-bold text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200">Status</th>
              <th class="p-4 text-center font-bold text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="invoice in invoices" 
              :key="invoice.id"
              class="hover:bg-slate-50/50 border-b border-slate-100 last:border-0 transition-colors"
            >
              <td class="p-4 text-slate-800 font-bold">{{ invoice.invoice_number }}</td>
              <td class="p-4">
                <div class="font-semibold text-slate-800">{{ invoice.nama_dapur }}</div>
                <div class="text-xs text-slate-500">{{ invoice.kode_dapur }}</div>
              </td>
              <td class="p-4 text-center text-slate-600">{{ formatDate(invoice.tanggal_invoice) }}</td>
              <td class="p-4 text-center text-slate-600 text-xs">
                {{ formatDate(invoice.periode_start) }} - {{ formatDate(invoice.periode_end) }}
              </td>
              <td class="p-4 text-right font-bold text-emerald-700">Rp {{ formatCurrency(invoice.total_amount) }}</td>
              <td class="p-4 text-center">
                <span :class="['inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border', getStatusClass(invoice.status)]">
                  {{ getStatusLabel(invoice.status) }}
                </span>
              </td>
              <td class="p-4 text-center">
                <button 
                  @click="viewInvoice(invoice.id)"
                  class="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-colors hover:bg-slate-200 inline-flex items-center gap-1"
                >
                  <Eye class="w-3 h-3" />
                  Lihat
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
