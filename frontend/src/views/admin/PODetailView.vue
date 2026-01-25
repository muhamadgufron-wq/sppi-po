<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuthStore } from '../../stores/auth';
import api from '../../services/api';
import type { POWithItems } from '../../types';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const po = ref<POWithItems | null>(null);
const loading = ref(false);
const showImageViewer = ref(false);
const currentImageIndex = ref(0);
const currentImageUrl = ref('');
const totalImages = ref(0);
const imageType = ref<'transfer' | 'shopping'>('shopping');

// Computed properties for conditional sections
const showApprovedPrices = computed(() => {
  return po.value && ['APPROVED', 'APPROVED_KEUANGAN', 'DANA_DITRANSFER', 'BELANJA_SELESAI', 'CLOSED'].includes(po.value.status);
});

const showRealPrices = computed(() => {
  return po.value && ['BELANJA_SELESAI', 'CLOSED'].includes(po.value.status);
});



const totalQty = computed(() => {
  if (!po.value || !po.value.items) return 0;
  return po.value.items.reduce((sum, item) => sum + (Number(item.qty_estimasi) || 0), 0);
});

const totalHargaEstimasi = computed(() => {
  if (!po.value || !po.value.items) return 0;
  return po.value.items.reduce((sum, item) => sum + (Number(item.harga_estimasi) || 0), 0);
});

const totalHargaApproved = computed(() => {
  if (!po.value || !po.value.items) return 0;
  return po.value.items.reduce((sum, item) => sum + (Number(item.harga_approved) || 0), 0);
});

const totalHargaReal = computed(() => {
  if (!po.value || !po.value.items) return 0;
  return po.value.items.reduce((sum, item) => sum + (Number(item.harga_real) || 0), 0);
});

const showTransferSection = computed(() => {
  return po.value && ['DANA_DITRANSFER', 'BELANJA_SELESAI', 'CLOSED'].includes(po.value.status);
});

onMounted(() => {
  loadPO();
});

async function loadPO() {
  loading.value = true;
  try {
    const response = await api.get(`/po/${route.params.id}`);
    if (response.data.success) {
      po.value = response.data.data;
      console.log('PO loaded:', po.value);
    }
  } catch (error) {
    alert('Gagal memuat data PO');
    router.push('/dashboard');
  } finally {
    loading.value = false;
  }
}

async function submitForApproval() {
  if (!confirm('Submit PO ini untuk approval?')) return;
  
  try {
    await api.post(`/po/${po.value!.id}/submit`);
    alert('PO berhasil disubmit untuk approval!');
    await loadPO();
  } catch (error: any) {
    alert(error.response?.data?.message || 'Gagal submit PO');
  }
}

async function deletePO() {
  if (!confirm('Hapus PO ini? Tindakan ini tidak dapat dibatalkan.')) return;
  
  try {
    await api.delete(`/po/${po.value!.id}`);
    alert('PO berhasil dihapus');
    router.push('/dashboard');
  } catch (error: any) {
    alert(error.response?.data?.message || 'Gagal menghapus PO');
  }
}

function exportToPDF() {
  if (!po.value) return;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Title
  doc.setFontSize(20);
  doc.text('Purchase Order', pageWidth / 2, 15, { align: 'center' });

  // PO Info
  doc.setFontSize(10);
  doc.text(`No. PO: ${po.value.po_number}`, 14, 25);
  doc.text(`Tanggal: ${formatDate(po.value.tanggal_po)}`, 14, 30);
  doc.text(`Status: ${getStatusLabel(po.value.status)}`, 14, 35);
  doc.text(`Dibuat Oleh: ${po.value.created_by_name}`, 14, 40);

  // Table Headers
  const headers = [['Item', 'Qty', 'Satuan', 'Harga Est']];
  if (showApprovedPrices.value) headers[0].push('Harga App');
  if (showRealPrices.value) headers[0].push('Harga Real', 'Deviasi');
  
  headers[0].push('Subtotal Est');
  if (showApprovedPrices.value) headers[0].push('Subtotal App');
  if (showRealPrices.value) headers[0].push('Subtotal Real');

  // Table Rows
  const rows = po.value.items.map((item: any) => {
    const row = [
      item.nama_barang,
      formatQty(item.qty_estimasi),
      item.satuan,
      formatCurrency(item.harga_estimasi)
    ];

    if (showApprovedPrices.value) row.push(formatCurrency(item.harga_approved || 0));
    if (showRealPrices.value) {
      row.push(formatCurrency(item.harga_real || 0));
      row.push(formatDeviation(item.harga_real, item.harga_approved).replace('Rp ', ''));
    }

    row.push(formatCurrency(item.subtotal_estimasi));
    if (showApprovedPrices.value) row.push(formatCurrency(item.subtotal_approved || 0));
    if (showRealPrices.value) row.push(formatCurrency((item.qty_estimasi || 0) * (item.harga_real || 0)));

    return row;
  });

  // Totals Row
  const totalRow = ['TOTAL', formatQty(totalQty.value), '-', formatCurrency(totalHargaEstimasi.value)];
  if (showApprovedPrices.value) totalRow.push(formatCurrency(totalHargaApproved.value));
  if (showRealPrices.value) {
    totalRow.push(formatCurrency(totalHargaReal.value));
     const devTotal = formatDeviation(po.value.total_real || 0, po.value.total_approved || 0).replace('Rp ', '');
     totalRow.push(devTotal);
  }
  
  totalRow.push(formatCurrency(po.value.total_estimasi));
  if (showApprovedPrices.value) totalRow.push(formatCurrency(po.value.total_approved || 0));
  if (showRealPrices.value) totalRow.push(formatCurrency(po.value.total_real || 0));

  rows.push(totalRow);

  autoTable(doc, {
    startY: 45,
    head: headers,
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [102, 126, 234] },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold' }
    },
    didParseCell: function(data) {
        if (data.row.index === rows.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
        }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Signatures / Approvals
  let currentY = finalY;
  
  if (po.value.approved_by_name) {
      doc.text(`Disetujui Manajer: ${po.value.approved_by_name} (${formatDate(po.value.approved_at!)})`, 14, currentY);
      currentY += 5;
      if (po.value.catatan_manajer) {
          doc.text(`Catatan: ${po.value.catatan_manajer}`, 14, currentY);
          currentY += 10;
      } else {
        currentY += 5;
      }
  }

  if (po.value.processed_by_keuangan_name) {
      doc.text(`Keuangan: ${po.value.processed_by_keuangan_name}`, 14, currentY);
      currentY += 5;
  }

  if (po.value.shopping_completed_by_name) {
      doc.text(`Belanja Selesai: ${po.value.shopping_completed_by_name} (${formatDate(po.value.shopping_completed_at!)})`, 14, currentY);
  }

  doc.save(`PO-${po.value.po_number}.pdf`);
}

function viewImage(url: string) {
  currentImageUrl.value = url;
  showImageViewer.value = true;
  totalImages.value = 1;
  currentImageIndex.value = 0;
}

function viewTransferProof() {
  if (po.value?.transfer?.bukti_transfer_path) {
    currentImageUrl.value = po.value.transfer.bukti_transfer_path.startsWith('http') 
      ? po.value.transfer.bukti_transfer_path 
      : `http://localhost:3000/${po.value.transfer.bukti_transfer_path}`;
    currentImageIndex.value = 0;
    totalImages.value = 1;
    imageType.value = 'transfer';
    showImageViewer.value = true;
  }
}



function closeImageViewer() {
  showImageViewer.value = false;
}

function prevImage() {
  if (currentImageIndex.value > 0 && po.value?.bukti_belanja_parsed) {
    currentImageIndex.value--;
    currentImageUrl.value = po.value.bukti_belanja_parsed[currentImageIndex.value].path.startsWith('http')
      ? po.value.bukti_belanja_parsed[currentImageIndex.value].path
      : `http://localhost:3000/${po.value.bukti_belanja_parsed[currentImageIndex.value].path}`;
  }
}

function nextImage() {
  if (currentImageIndex.value < totalImages.value - 1 && po.value?.bukti_belanja_parsed) {
    currentImageIndex.value++;
    currentImageUrl.value = po.value.bukti_belanja_parsed[currentImageIndex.value].path.startsWith('http')
      ? po.value.bukti_belanja_parsed[currentImageIndex.value].path
      : `http://localhost:3000/${po.value.bukti_belanja_parsed[currentImageIndex.value].path}`;
  }
}



function formatDate(date: string) {
  return new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatQty(qty: number) {
  return Math.round(qty);
}

function formatCurrency(amount: number) {
  return Math.round(amount).toLocaleString('id-ID');
}

function getStatusClass(status: string) {
  const statusMap: Record<string, string> = {
    'DRAFT': 'bg-blue-50 text-blue-700 border-blue-100',
    'MENUNGGU_APPROVAL': 'bg-amber-50 text-amber-700 border-amber-100',
    'APPROVED': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'APPROVED_KEUANGAN': 'bg-sky-50 text-sky-700 border-sky-100',
    'REJECTED': 'bg-red-50 text-red-700 border-red-100',
    'DANA_DITRANSFER': 'bg-purple-50 text-purple-700 border-purple-100',
    'BELANJA_SELESAI': 'bg-indigo-50 text-indigo-700 border-indigo-100',
    'CLOSED': 'bg-gray-100 text-gray-700 border-gray-200'
  };
  return statusMap[status] || 'bg-gray-50 text-gray-700 border-gray-100';
}

function getStatusLabel(status: string) {
  const labelMap: Record<string, string> = {
    'DRAFT': 'Draft',
    'MENUNGGU_APPROVAL': 'Menunggu Approval',
    'APPROVED': 'Disetujui Manajer',
    'APPROVED_KEUANGAN': 'Disetujui Keuangan',
    'REJECTED': 'Ditolak',
    'DANA_DITRANSFER': 'Dana Ditransfer',
    'BELANJA_SELESAI': 'Belanja Selesai',
    'CLOSED': 'Ditutup'
  };
  return labelMap[status] || status;
}

function formatDeviation(real: number, approved: number) {
  const diff = (approved || 0) - (real || 0);
  const prefix = diff > 0 ? '+' : (diff < 0 ? '-' : '');
  return `Rp ${prefix}${formatCurrency(Math.abs(diff))}`;
}

function getDeviationClass(real: number, approved: number) {
  const diff = (approved || 0) - (real || 0);
  if (diff < 0) return 'text-red-600'; // Over budget (Real > Approved) -> Negative Diff -> Red
  if (diff > 0) return 'text-green-600'; // Under budget (Real < Approved) -> Positive Diff -> Green
  return 'text-neutral-500';
}
</script>

<template>
  <div class="max-w-[1200px] mx-auto">
    <div v-if="loading" class="text-center p-16 text-slate-500 text-base">Memuat data...</div>
    <div v-else-if="po" class="flex flex-col gap-6">
      
      <!-- Navigation Back -->
      <button 
        @click="router.push('/po')" 
        class="flex items-center gap-2 text-slate-500 hover:text-emerald-600 font-bold text-sm transition-colors w-fit group"
      >
        <div class="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:bg-emerald-50 group-hover:border-emerald-200 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="group-hover:-translate-x-0.5 transition-transform"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        </div>
        Kembali
      </button>

      <!-- Main Content Card -->
      <div class="bg-white rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-emerald-50 overflow-hidden">
        
        <!-- PO Header Section -->
        <div class="p-6 md:p-8 border-b border-slate-100">
          <div class="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
            <div>
              <div class="flex items-center gap-3 mb-2">
                <h1 class="m-0 text-2xl font-bold text-slate-800">{{ po.po_number }}</h1>
                <span :class="['px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border', getStatusClass(po.status)]">{{ getStatusLabel(po.status) }}</span>
              </div>
              <p class="text-slate-500 text-sm">Dibuat pada {{ formatDateTime(po.created_at) }} oleh <span class="font-semibold text-slate-700">{{ po.created_by_name }}</span></p>
            </div>
            <div class="flex items-center gap-2">
              <button @click="exportToPDF" class="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-bold transition-colors hover:bg-slate-50 hover:text-slate-800 flex items-center gap-2">
                <span>🖨️</span> PDF
              </button>
              <div v-if="po.status === 'DRAFT' && authStore.userRole === 'ADMIN'" class="flex gap-2">
                <button @click="submitForApproval" class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold transition-colors hover:bg-emerald-700 shadow-sm shadow-emerald-200">Submit Approval</button>
                <button @click="deletePO" class="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold transition-colors hover:bg-red-50">Hapus</button>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <div class="flex justify-between py-1 border-b border-slate-200/50">
              <span class="text-slate-500 font-medium">Tanggal PO</span>
              <span class="text-slate-800 font-bold">{{ formatDate(po.tanggal_po) }}</span>
            </div>
            <div v-show="po.catatan_admin" class="col-span-1 md:col-span-2 mt-2 pt-2 border-t border-slate-200/50">
              <span class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Catatan Admin</span>
              <span class="text-slate-700">{{ po.catatan_admin }}</span>
            </div>
          </div>
        </div>

        <!-- Items Table Section -->
        <div class="p-6 md:p-8 pt-2">
          <h3 class="m-0 mb-6 text-lg font-bold text-slate-800 flex items-center gap-2">
            <span class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">📦</span>
            Daftar Item
          </h3>
          
          <div class="overflow-x-auto rounded-xl border border-slate-100">
            <table class="w-full border-collapse text-sm">
              <thead>
                <tr class="bg-slate-50/80">
                  <th class="p-3 text-left font-bold text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200">Barang</th>
                  <th class="p-3 text-right font-bold text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200">Qty</th>
                  <th class="p-3 text-left font-bold text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200">Satuan</th>
                  <th class="p-3 text-right font-bold text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200">Harga Est.</th>
                  <th v-if="showApprovedPrices" class="p-3 text-right font-bold text-[11px] text-emerald-600 uppercase tracking-wider border-b border-emerald-100 bg-emerald-50/30">Harga App.</th>
                  <th v-if="showRealPrices" class="p-3 text-right font-bold text-[11px] text-sky-600 uppercase tracking-wider border-b border-sky-100 bg-sky-50/30">Harga Real</th>
                  <th class="p-3 text-right font-bold text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200">Subtotal</th>
                  <th v-if="showApprovedPrices" class="p-3 text-right font-bold text-[11px] text-emerald-600 uppercase tracking-wider border-b border-emerald-100 bg-emerald-50/30">Subtotal App.</th>
                  <th v-if="showRealPrices" class="p-3 text-right font-bold text-[11px] text-sky-600 uppercase tracking-wider border-b border-sky-100 bg-sky-50/30">Subtotal Real</th>
                  <th v-if="showRealPrices" class="p-3 text-right font-bold text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200">Deviasi</th>
                  <th v-if="showRealPrices" class="p-3 text-center font-bold text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200">Bukti</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in po.items" :key="item.id" class="hover:bg-slate-50/50 border-b border-slate-100 last:border-0 transition-colors">
                  <td class="p-3 text-slate-800 font-semibold">
                    {{ item.nama_barang }}
                    <span v-if="item.kategori_sayuran" class="block text-[10px] text-slate-400 font-normal">{{ item.kategori_sayuran }}</span>
                  </td>
                  <td class="p-3 text-right text-slate-700">{{ formatQty(item.qty_estimasi) }}</td>
                  <td class="p-3 text-slate-500 text-xs">{{ item.satuan }}</td>
                  <td class="p-3 text-right text-slate-600">Rp {{ formatCurrency(item.harga_estimasi) }}</td>
                  <td v-if="showApprovedPrices" class="p-3 text-right text-emerald-700 font-medium bg-emerald-50/10">
                    Rp {{ formatCurrency(item.harga_approved || 0) }}
                  </td>
                  <td v-if="showRealPrices" class="p-3 text-right text-sky-700 font-medium bg-sky-50/10">
                    Rp {{ formatCurrency(item.harga_real || 0) }}
                  </td>
                  <td class="p-3 text-right text-slate-800 font-semibold">Rp {{ formatCurrency(item.subtotal_estimasi) }}</td>
                  <td v-if="showApprovedPrices" class="p-3 text-right text-emerald-700 font-bold bg-emerald-50/10">
                    Rp {{ formatCurrency(item.subtotal_approved || 0) }}
                  </td>
                  <td v-if="showRealPrices" class="p-3 text-right text-sky-700 font-bold bg-sky-50/10">
                    Rp {{ formatCurrency((item.qty_estimasi || 0) * (item.harga_real || 0)) }}
                  </td>
                  <td v-if="showRealPrices" class="p-3 text-right font-bold text-xs" :class="getDeviationClass((item.qty_estimasi || 0) * (item.harga_real || 0), item.subtotal_approved || ((item.qty_estimasi || 0) * (item.harga_approved || 0)))">
                    {{ formatDeviation((item.qty_estimasi || 0) * (item.harga_real || 0), item.subtotal_approved || ((item.qty_estimasi || 0) * (item.harga_approved || 0))) }}
                  </td>
                  <td v-if="showRealPrices" class="p-3 text-center">
                       <img 
                         v-if="item.bukti_foto"
                         :src="item.bukti_foto.startsWith('http') ? item.bukti_foto : `http://localhost:3000/${item.bukti_foto}`" 
                         class="w-8 h-8 object-cover rounded border border-slate-200 mx-auto cursor-pointer hover:scale-110 transition-transform"
                         @click.stop="viewImage(item.bukti_foto.startsWith('http') ? item.bukti_foto : `http://localhost:3000/${item.bukti_foto}`)"
                         title="Lihat Bukti"
                       />
                     <span v-else class="text-[10px] text-slate-300">-</span>
                  </td>
                </tr>
              </tbody>
              <tfoot class="border-t border-slate-200 bg-slate-50">
                <tr>
                  <td class="p-4 text-slate-500 text-xs font-bold uppercase tracking-wider text-right" colspan="4">Total</td>
                  <td v-if="showApprovedPrices" class="p-3 text-right font-bold text-emerald-600 bg-emerald-50/30 border-t border-emerald-100" colspan="1"></td>
                  <td v-if="showRealPrices" class="p-3 text-right font-bold text-sky-600 bg-sky-50/30 border-t border-sky-100" colspan="1"></td>
                  <td class="p-4 text-slate-800 text-base font-bold text-right">Rp {{ formatCurrency(po.total_estimasi) }}</td>
                  <td v-if="showApprovedPrices" class="p-4 text-base font-bold text-right text-emerald-700 bg-emerald-50/30 border-t border-emerald-100">
                    Rp {{ formatCurrency(po.total_approved || 0) }}
                  </td>
                  <td v-if="showRealPrices" class="p-4 text-base font-bold text-right text-sky-700 bg-sky-50/30 border-t border-sky-100">
                    Rp {{ formatCurrency(po.total_real || 0) }}
                  </td>
                   <td v-if="showRealPrices" class="p-4 text-xs font-bold text-right" :class="getDeviationClass(po.total_real || 0, po.total_approved || 0)">
                    {{ formatDeviation(po.total_real || 0, po.total_approved || 0) }}
                  </td>
                  <td v-if="showRealPrices" class="bg-slate-50 border-t border-slate-200"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>

      <!-- Transfer Details Section (Keeping separate as it's a distinct 'receipt') -->
      <div v-if="showTransferSection && po.transfer" class="bg-white p-5 md:p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-emerald-50">
        <h3 class="m-0 mb-4 text-lg font-bold text-slate-800 flex items-center gap-2 text-purple-700">🏦 Detail Transfer</h3>
        <div class="flex flex-col gap-3 text-sm">
          <div class="flex justify-between py-1 border-b border-slate-50">
            <span class="text-slate-500">Nominal</span>
             <span class="font-bold text-purple-700">Rp {{ formatCurrency(po.transfer.nominal_transfer) }}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-50">
            <span class="text-slate-500">Tanggal</span>
            <span class="font-medium text-slate-900">{{ formatDate(po.transfer.tanggal_transfer) }}</span>
          </div>
           <div class="flex justify-between py-1 border-b border-slate-50">
            <span class="text-slate-500">Bank Tujuan</span>
            <span class="font-medium text-slate-900">{{ po.transfer.nomor_rekening_tujuan || '-' }}</span>
          </div>
          <button v-if="po.transfer.bukti_transfer_path" @click="viewTransferProof" class="mt-2 w-full py-2 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors border border-purple-100 flex items-center justify-center gap-2">
            <span>📄</span> Lihat Bukti Transfer
          </button>
        </div>
      </div>
    </div>

    <!-- Image Viewer Modal (Unchanged logic, just styling) -->
    <div v-if="showImageViewer" class="fixed inset-0 bg-black/95 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm" @click="closeImageViewer">
      <div class="relative w-full max-w-4xl max-h-screen flex flex-col items-center" @click.stop>
        <button class="absolute -top-12 right-0 text-white/70 hover:text-white text-4xl font-light" @click="closeImageViewer">×</button>
        
        <div class="relative w-full flex items-center justify-center">
          <button v-if="currentImageIndex > 0" class="absolute left-0 p-4 text-white hover:scale-110 transition-transform" @click.stop="prevImage">❮</button>
          
          <img :src="currentImageUrl" alt="Bukti" class="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
          
          <button v-if="currentImageIndex < totalImages - 1" class="absolute right-0 p-4 text-white hover:scale-110 transition-transform" @click.stop="nextImage">❯</button>
        </div>
        
        <div class="mt-4 text-white/50 text-sm font-medium tracking-widest">
          {{ currentImageIndex + 1 }} / {{ totalImages }}
        </div>
      </div>
    </div>
  </div>
</template>

