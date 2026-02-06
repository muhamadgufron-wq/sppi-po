<template>
  <div class="animate-[fadeIn_0.5s_ease-out]">
    <div class="max-w-[1600px] mx-auto">
      
      <!-- 1. Header Section -->
      <div class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="m-0 text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Halo, {{ authStore.user?.nama_lengkap || 'Admin Operasional' }}</h1>
          <p class="m-0 mt-2 text-slate-500 font-medium">Berikut ringkasan purchase order pada <span class="text-slate-800 font-bold">{{ formatDate(selectedDate) }}</span>.</p>
        </div>
        
        <!-- Date Filter -->
        <div class="bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
           <div class="p-2 bg-slate-50 rounded-lg text-slate-500">
             <Clock class="w-4 h-4" />
           </div>
           <input 
             v-model="selectedDate" 
             type="date" 
             class="bg-transparent border-none outline-none text-sm font-bold text-slate-700 cursor-pointer pr-2"
             @change="fetchData"
           />
        </div>
      </div>

      <!-- Main Layout Grid (Desktop: 2 Columns) -->
      <div class="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-8 items-start">
        
        <!-- Left Column (Stats & Chart) -->
        <div class="flex flex-col gap-8">
          
          <!-- 2. Stats Grid (4 Cards) -->
          <div class="grid grid-cols-2 md:grid-cols-2 gap-4 md:gap-6">
            <!-- Total PO -->
            <div class="bg-white p-5 rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-lg transition-shadow border border-emerald-50 relative overflow-hidden group">
              <div class="flex flex-col h-full justify-between relative z-10">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                    <FileText class="w-5 h-5" />
                  </div>
                  <p class="m-0 text-xs font-bold text-slate-400 uppercase tracking-wider">TOTAL PO</p>
                </div>
                <h3 class="text-2xl md:text-3xl font-bold text-slate-800 m-0 text-right">{{ stats.total }}</h3>
              </div>
            </div>

            <!-- Menunggu -->
            <div class="bg-white p-5 rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-lg transition-shadow border border-emerald-50 relative overflow-hidden group">
              <div class="flex flex-col h-full justify-between relative z-10">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                    <Clock class="w-5 h-5" />
                  </div>
                  <p class="m-0 text-xs font-bold text-slate-400 uppercase tracking-wider">MENUNGGU</p>
                </div>
                <h3 class="text-2xl md:text-3xl font-bold text-slate-800 m-0 text-right">{{ stats.pending }}</h3>
              </div>
            </div>

            <!-- Approved -->
            <div class="bg-white p-5 rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-lg transition-shadow border border-emerald-50 relative overflow-hidden group">
              <div class="flex flex-col h-full justify-between relative z-10">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <CheckCircle class="w-5 h-5" />
                  </div>
                  <p class="m-0 text-xs font-bold text-slate-400 uppercase tracking-wider">APPROVED</p>
                </div>
                <h3 class="text-2xl md:text-3xl font-bold text-slate-800 m-0 text-right">{{ stats.approved }}</h3>
              </div>
            </div>

            <!-- Est. Biaya -->
            <div class="bg-white p-5 rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] hover:shadow-lg transition-shadow border border-emerald-50 relative overflow-hidden group">
              <div class="flex flex-col h-full justify-between relative z-10">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                     <Banknote class="w-5 h-5" />
                  </div>
                   <p class="m-0 text-xs font-bold text-slate-400 uppercase tracking-wider">MODAL</p>
                </div>
                <h3 class="text-2xl md:text-3xl font-bold text-slate-800 m-0 text-right">Rp {{ formatCurrency(stats.total_estimasi) }}</h3>
              </div>
            </div>
          </div>

          <!-- 3. Chart Section "Aktivitas PO Harian" -->
          <div class="bg-white p-6 md:p-8 rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-slate-50">
            <div class="flex justify-between items-center mb-6">
              <div>
                <h2 class="m-0 text-lg font-bold text-slate-800">Aktivitas PO Harian</h2>
                <p class="m-0 text-sm text-slate-400">7 Hari Terakhir</p>
              </div>
            </div>
            <div class="h-[300px]">
               <DailyPOChart v-if="!loading && dailyStats.length > 0" :data="dailyStats" />
                 <div v-else class="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                   <BarChart2 class="w-8 h-8 text-slate-300" />
                   <span>Memuat data grafik...</span>
                 </div>
            </div>
          </div>

        </div>

        <!-- Right Column (Actions & Recent) -->
        <div class="flex flex-col gap-6">
          
          <!-- Profit Card -->
          <div class="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-3xl shadow-[0_10px_30px_-10px_rgba(16,185,129,0.4)] text-white relative overflow-hidden group border border-emerald-400/20">
            <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp class="w-24 h-24" />
            </div>
             <div class="relative z-10">
               <div class="flex items-center gap-3 mb-3">
                 <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm shadow-inner shadow-white/10">
                   <TrendingUp class="w-5 h-5 text-white" />
                 </div>
                 <p class="m-0 text-xs font-bold text-emerald-100 uppercase tracking-wider">ESTIMASI KEUNTUNGAN</p>
               </div>
               <h3 class="text-3xl font-bold text-white m-0 tracking-tight">Rp {{ formatCurrency(stats.total_profit) }}</h3>
               <div class="mt-3 flex items-center gap-2">
                 <span class="text-[10px] font-bold bg-emerald-400/20 text-emerald-50 px-2 py-1 rounded-lg border border-emerald-400/20">
                   {{ formatDate(selectedDate) }}
                 </span>
                 <span class="text-[10px] text-emerald-100/80">
                   Potensi profit pada tanggal ini
                 </span>
               </div>
             </div>
          </div>

          <!-- 4. Quick Actions "Aksi Cepat" -->
          <div>
            <h2 class="text-lg font-bold text-slate-800 m-0 mb-4">Quick Actions</h2>
            <div class="grid grid-cols-3 gap-4">
              <button class="flex flex-col items-center gap-3 p-4 bg-white rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-slate-50 hover:-translate-y-1 transition-transform group cursor-pointer">
                 <a href="po/create">
                 <div class="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-200 group-hover:scale-110 transition-transform">
                    <ShoppingCart class="w-5 h-5" />
                 </div>
                 <span class="text-xs font-bold text-slate-700">Buat PO</span></a>
              </button>              
              <button class="flex flex-col items-center gap-3 p-4 bg-white rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-slate-50 hover:-translate-y-1 transition-transform group cursor-pointer">
                 <a href="po">
                 <div class="w-12 h-12 rounded-full bg-white border-2 border-slate-100 text-slate-600 flex items-center justify-center group-hover:border-slate-300 transition-colors">
                    <List class="w-5 h-5" />
                 </div>
                 <span class="text-xs font-bold text-slate-700">Daftar PO</span>
                 </a>
              </button>
              
              <button class="flex flex-col items-center gap-3 p-4 bg-white rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-slate-50 hover:-translate-y-1 transition-transform group cursor-pointer">
                 <a href="dapur">
                 <div class="w-12 h-12 rounded-full bg-white border-2 border-slate-100 text-slate-600 flex items-center justify-center group-hover:border-slate-300 transition-colors">
                    <Store class="w-5 h-5" />
                 </div>
                 <span class="text-xs font-bold text-slate-700">Dapur</span>
                 </a>
              </button>
            </div>
          </div>

          <!-- 5. Recent POs "PO Terbaru" -->
          <div class="flex-1 bg-white rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-emerald-50 p-6">
            <div class="flex justify-between items-center mb-6">
              <h2 class="m-0 text-lg font-bold text-slate-800">PO Terbaru</h2>
              <button class="text-emerald-600 font-bold text-sm hover:underline" @click="router.push('/po')">Lihat Semua</button>
            </div>
            
            <div class="flex flex-col gap-4">
              <div v-if="recentPOs.length === 0" class="text-center py-8 text-slate-400 text-sm">
                Belum ada PO terbaru.
              </div>
              <div 
                v-for="po in recentPOs" 
                :key="po.id"
                class="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group"
                @click="router.push(`/po/${po.id}`)"
              >
                <div class="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:scale-105 transition-transform">
                  <FileText class="w-6 h-6" />
                </div>
                <div class="flex-1">
                  <h4 class="m-0 text-sm font-bold text-slate-800">{{ po.po_number }}</h4>
                  <p class="m-0 text-xs text-slate-500">Modal: Rp {{ formatFullCurrency(po.total_estimasi) }}</p>
                </div>
                <div class="text-right">
                  <span :class="['inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border', getStatusClass(po.status)]">
                    {{ getStatusLabel(po.status) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { useAutoRefresh } from '../../composables/useAutoRefresh';
import api from '../../services/api';
import DailyPOChart from '../../components/DailyPOChart.vue';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  Banknote, 
  BarChart2, 
  ShoppingCart, 
  List,
  TrendingUp,
  Store
} from 'lucide-vue-next';

const router = useRouter(); // Initialize router

const authStore = useAuthStore();
const selectedDate = ref(new Date().toISOString().split('T')[0]);
const stats = ref({ total: 0, pending: 0, approved: 0, total_estimasi: 0, total_profit: 0 });
const dailyStats = ref<{ date: string; count: number }[]>([]);
const recentPOs = ref<any[]>([]); // To store the list for "PO Terbaru"
const loading = ref(false);

onMounted(async () => {
  // Always fetch data for specific dashboard
  await fetchData();
});

// Auto-refresh every 30 seconds
useAutoRefresh(fetchData);

async function fetchData() {
  loading.value = true;
  try {
    // 1. Fetch Stats for Selected Date
    const statsRes = await api.get('/po/stats', { params: { date: selectedDate.value } });
    if (statsRes.data.success) {
      stats.value = statsRes.data.data;
    }

    // 2. Fetch Recent POs
    const poListRes = await api.get('/po', { params: { limit: 5 } });
    if (poListRes.data.success) {
      recentPOs.value = poListRes.data.data;
    }

    // 3. Fetch Daily Chart Data
    const dailyRes = await api.get('/po/stats/daily');
    if (dailyRes.data.success) {
      dailyStats.value = processLast7Days(dailyRes.data.data);
    }

  } catch (error) {
    console.error('Unexpected error fetching dashboard data:', error);
  } finally {
    loading.value = false;
  }
}

function processLast7Days(data: { date: string; count: number }[]) {
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    
    // Use local YYYY-MM-DD format to match user's local day
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const found = data.find(item => item.date === dateStr);
    result.push({
      date: dateStr,
      count: found ? found.count : 0
    });
  }
  return result;
}

function formatCurrency(amount: number) {
  return Math.round(amount).toLocaleString('id-ID');
}

function formatFullCurrency(amount: number) {
  if (!amount) return '0';
  return Math.round(amount).toLocaleString('id-ID');
}

function getStatusClass(status: string) {
  const map: any = {
    'APPROVED': 'bg-emerald-100 text-emerald-700',
    'MENUNGGU_APPROVAL': 'bg-amber-100 text-amber-700',
    'DRAFT': 'bg-slate-100 text-slate-600',
    'REJECTED': 'bg-red-100 text-red-700'
  };
  return map[status] || 'bg-slate-100 text-slate-600';
}

function getStatusLabel(status: string) {
    const map: any = {
    'APPROVED': 'Approved',
    'MENUNGGU_APPROVAL': 'Menunggu',
    'DRAFT': 'Draft',
    'REJECTED': 'Ditolak',
    'APPROVED_KEUANGAN': 'Keuangan',
    'DANA_DITRANSFER': 'Transfer',
    'BELANJA_SELESAI': 'Selesai',
    'CLOSED': 'Closed'
  };
  return map[status] || status;
}

function formatDate(dateString: string) {
  if (!dateString) return '';
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return new Date(dateString).toLocaleDateString('id-ID', options);
}
</script>

<style>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
