<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../../services/api';
import { FileText, Printer, CheckCircle, DollarSign, Trash2, ChevronRight } from 'lucide-vue-next';
import Swal from 'sweetalert2';

const router = useRouter();
const route = useRoute();

interface InvoiceItem {
  id: number;
  po_number: string;
  tanggal_po: string;
  nominal: number;
}

interface Invoice {
  id: number;
  invoice_number: string;
  dapur_id: number;
  tanggal_invoice: string;
  periode_start: string;
  periode_end: string;
  up_nama?: string;
  total_amount: number;
  sisa_tagihan: number;
  metode_pembayaran?: string;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';
  nama_dapur?: string;
  kode_dapur?: string;
  dapur_lokasi?: string;
  created_by_name?: string;
  items?: InvoiceItem[];
}

const invoice = ref<Invoice | null>(null);
const loading = ref(false);

onMounted(() => {
  loadInvoice();
});

async function loadInvoice() {
  loading.value = true;
  try {
    const response = await api.get(`/invoices/${route.params.id}`);
    if (response.data.success) {
      invoice.value = response.data.data;
    }
  } catch (error) {
    console.error('Load invoice error:', error);
    Swal.fire({
      icon: 'error',
      title: 'Gagal Memuat Invoice',
      text: 'Invoice tidak ditemukan',
      confirmButtonColor: '#10b981'
    });
    router.push('/invoices');
  } finally {
    loading.value = false;
  }
}

async function issueInvoice() {
  const result = await Swal.fire({
    title: 'Terbitkan Invoice?',
    html: `
      <p class="text-sm text-slate-500 mb-2">Status akan berubah menjadi <span class="font-bold text-blue-600">ISSUED</span></p>
      <p class="text-xs text-slate-400">Invoice yang sudah diterbitkan tidak dapat dihapus</p>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#3b82f6',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Ya, Terbitkan!',
    cancelButtonText: 'Batal'
  });

  if (!result.isConfirmed) return;

  try {
    await api.put(`/invoices/${invoice.value!.id}/issue`);
    await Swal.fire({
      icon: 'success',
      title: 'Invoice Diterbitkan!',
      text: 'Invoice berhasil diterbitkan',
      confirmButtonColor: '#10b981'
    });
    await loadInvoice();
  } catch (error: any) {
    Swal.fire({
      icon: 'error',
      title: 'Gagal Issue Invoice',
      text: error.response?.data?.message || 'Gagal issue invoice',
      confirmButtonColor: '#10b981'
    });
  }
}

async function markAsPaid() {
  const { value: metode } = await Swal.fire({
    title: 'Metode Pembayaran',
    input: 'select',
    inputOptions: {
      'CASH': 'Cash',
      'TRANSFER': 'Transfer',
      'GIRO': 'Giro'
    },
    inputPlaceholder: 'Pilih metode pembayaran',
    showCancelButton: true,
    confirmButtonColor: '#10b981',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Tandai Lunas',
    cancelButtonText: 'Batal',
    inputValidator: (value) => {
      if (!value) {
        return 'Pilih metode pembayaran!'
      }
    }
  });

  if (!metode) return;

  try {
    await api.put(`/invoices/${invoice.value!.id}/payment`, {
      metode_pembayaran: metode.toUpperCase()
    });
    await Swal.fire({
      icon: 'success',
      title: 'Invoice Lunas!',
      html: `
        <p class="text-sm text-slate-500">Metode: <span class="font-bold text-emerald-600">${metode}</span></p>
      `,
      confirmButtonColor: '#10b981'
    });
    await loadInvoice();
  } catch (error: any) {
    Swal.fire({
      icon: 'error',
      title: 'Gagal Update Payment',
      text: error.response?.data?.message || 'Gagal update payment',
      confirmButtonColor: '#10b981'
    });
  }
}

async function deleteInvoice() {
  const result = await Swal.fire({
    title: 'Hapus Invoice?',
    html: `
      <p class="text-sm text-red-600 font-semibold mb-2">Tindakan tidak dapat dibatalkan!</p>
      <p class="text-xs text-slate-500">Invoice akan dihapus permanen dari sistem</p>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Ya, Hapus!',
    cancelButtonText: 'Batal'
  });

  if (!result.isConfirmed) return;

  try {
    await api.delete(`/invoices/${invoice.value!.id}`);
    await Swal.fire({
      icon: 'success',
      title: 'Invoice Dihapus!',
      text: 'Invoice berhasil dihapus',
      confirmButtonColor: '#10b981'
    });
    router.push('/invoices');
  } catch (error: any) {
    Swal.fire({
      icon: 'error',
      title: 'Gagal Hapus Invoice',
      text: error.response?.data?.message || 'Gagal hapus invoice',
      confirmButtonColor: '#10b981'
    });
  }
}

function exportToPDF() {
  if (!invoice.value) return;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header - Company Name
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 14, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PT. SUMBER PANGAN PERSADA INDONESIA', pageWidth - 14, 15, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text('SUPPLIER BUAH DAN SAYUR', pageWidth - 14, 20, { align: 'right' });

  // Invoice Info
  doc.setFontSize(9);
  doc.text('KEPADA :', 14, 35);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.value.nama_dapur || '', 14, 40);
  doc.setFont('helvetica', 'normal');
  if (invoice.value.up_nama) {
    doc.text(`UP : ${invoice.value.up_nama}`, 14, 45);
  }

  doc.text('TANGGAL :', pageWidth - 14, 35, { align: 'right' });
  doc.text(formatDate(invoice.value.tanggal_invoice), pageWidth - 14, 40, { align: 'right' });
  doc.text('NO. INVOICE:', pageWidth - 14, 45, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.value.invoice_number, pageWidth - 14, 50, { align: 'right' });

  // Table
  const headers = [['NO', 'RINCIAN', 'NOMINAL']];
  const rows = invoice.value.items?.map((item, index) => [
    (index + 1).toString(),
    `${item.po_number} (PO, ${formatDateShort(item.tanggal_po)})`,
    `Rp ${formatCurrency(item.nominal)}`
  ]) || [];

  autoTable(doc, {
    startY: 60,
    head: headers,
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineWidth: 0.5, lineColor: [0, 0, 0] },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 120 },
      2: { cellWidth: 50, halign: 'right' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 5;

  // Total
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(14, finalY, pageWidth - 14, finalY);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('JUMLAH', 14, finalY + 7);
  doc.text(`Rp ${formatCurrency(invoice.value.total_amount)}`, pageWidth - 14, finalY + 7, { align: 'right' });

  doc.line(14, finalY + 10, pageWidth - 14, finalY + 10);

  // Payment method
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('☐ CASH     ☐ TRANSFER     ☐ GIRO', 14, finalY + 20);

  // Bank info
  doc.text('PEMBAYARAN:', 14, finalY + 30);
  doc.text('BANK BCA', 14, finalY + 35);
  doc.text('Atas Nama : PT SUMBER PANGAN PERSADA INDONESIA', 14, finalY + 40);
  doc.text('No. Rek : 4732151625', 14, finalY + 45);

  // Signature
  doc.text('PT.SUMBER PANGAN PERSADA IND', pageWidth - 14, finalY + 30, { align: 'right' });
  doc.text('( SITI NUR ALLISA )', pageWidth - 14, finalY + 55, { align: 'right' });

  doc.save(`Invoice-${invoice.value.invoice_number}.pdf`);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function formatDateShort(date: string) {
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
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
</script>

<template>
  <div class="max-w-[1400px] mx-auto">
    <div v-if="loading" class="text-center p-16 text-slate-500">Memuat data...</div>
    
    <div v-else-if="invoice">
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-2 text-sm mb-4">
        <button 
          @click="router.push('/invoices')"
          class="text-slate-500 hover:text-emerald-600 font-medium transition-colors"
        >
          Invoice
        </button>
        <ChevronRight class="w-4 h-4 text-slate-300" />
        <span class="text-slate-800 font-bold">Detail Invoice</span>
      </nav>

      <!-- Invoice Card -->
      <div class="bg-white rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-emerald-50 overflow-hidden">
        <!-- Header -->
        <div class="p-6 md:p-8 border-b border-slate-100">
          <div class="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
            <div>
              <div class="flex items-center gap-3 mb-2">
                <h1 class="m-0 text-2xl font-bold text-slate-800">{{ invoice.invoice_number }}</h1>
                <span :class="['px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border', getStatusClass(invoice.status)]">
                  {{ getStatusLabel(invoice.status) }}
                </span>
              </div>
              <p class="text-slate-500 text-sm">Tanggal: {{ formatDate(invoice.tanggal_invoice) }}</p>
            </div>

            <div class="flex items-center gap-2">
              <button 
                @click="exportToPDF"
                class="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-bold transition-colors hover:bg-slate-50 flex items-center gap-2"
              >
                <Printer class="w-4 h-4" />
                PDF
              </button>

              <button 
                v-if="invoice.status === 'DRAFT'"
                @click="issueInvoice"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold transition-colors hover:bg-blue-700 flex items-center gap-2"
              >
                <CheckCircle class="w-4 h-4" />
                Issue
              </button>

              <button 
                v-if="invoice.status === 'ISSUED'"
                @click="markAsPaid"
                class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold transition-colors hover:bg-emerald-700 flex items-center gap-2"
              >
                <DollarSign class="w-4 h-4" />
                Mark Paid
              </button>

              <button 
                v-if="invoice.status === 'DRAFT'"
                @click="deleteInvoice"
                class="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold transition-colors hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 class="w-4 h-4" />
                Hapus
              </button>
            </div>
          </div>

          <!-- Invoice Info Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <div>
              <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Kepada</p>
              <p class="text-slate-800 font-bold">{{ invoice.nama_dapur }}</p>
              <p v-if="invoice.up_nama" class="text-sm text-slate-600">UP: {{ invoice.up_nama }}</p>
            </div>
            <div>
              <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Periode</p>
              <p class="text-slate-800 font-semibold text-sm">
                {{ formatDateShort(invoice.periode_start) }} - {{ formatDateShort(invoice.periode_end) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Items Table -->
        <div class="p-6 md:p-8">
          <h3 class="m-0 mb-4 text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileText class="w-5 h-5 text-emerald-600" />
            Rincian
          </h3>

          <div class="overflow-x-auto rounded-xl border border-slate-100">
            <table class="w-full border-collapse text-sm">
              <thead>
                <tr class="bg-slate-50/80">
                  <th class="p-3 text-center font-bold text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200 w-16">No</th>
                  <th class="p-3 text-left font-bold text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200">Rincian</th>
                  <th class="p-3 text-right font-bold text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200 w-40">Nominal</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="(item, index) in invoice.items" 
                  :key="item.id"
                  class="hover:bg-slate-50/50 border-b border-slate-100 last:border-0"
                >
                  <td class="p-3 text-center text-slate-600">{{ index + 1 }}</td>
                  <td class="p-3 text-slate-800">
                    <span class="font-bold">{{ item.po_number }}</span>
                    <span class="text-slate-500 text-xs ml-2">(PO, {{ formatDateShort(item.tanggal_po) }})</span>
                  </td>
                  <td class="p-3 text-right font-bold text-emerald-700">Rp {{ formatCurrency(item.nominal) }}</td>
                </tr>
              </tbody>
              <tfoot class="border-t-2 border-slate-200 bg-slate-50">
                <tr>
                  <td colspan="2" class="p-4 text-right font-bold text-slate-700 uppercase">Jumlah</td>
                  <td class="p-4 text-right font-bold text-emerald-700 text-lg">Rp {{ formatCurrency(invoice.total_amount) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Payment Info -->
          <div v-if="invoice.metode_pembayaran" class="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <p class="text-sm font-bold text-emerald-800">
              Metode Pembayaran: {{ invoice.metode_pembayaran }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
