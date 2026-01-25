<template>
  <div class="animate-[fadeIn_0.5s_ease-out]">
    <div class="max-w-[1600px] mx-auto">
      
      <!-- 1. Header Section -->
      <div class="mb-8">
        <h1 class="m-0 text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Halo, {{ authStore.user?.nama_lengkap || 'Admin Operasional' }}</h1>
        <p class="m-0 mt-2 text-slate-500 font-medium">Berikut ringkasan pengadaan hari ini.</p>
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
                  <p class="m-0 text-xs font-bold text-slate-400 uppercase tracking-wider">TOTAL PO (HARI INI)</p>
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
                   <p class="m-0 text-xs font-bold text-slate-400 uppercase tracking-wider">EST. BIAYA</p>
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
        <div class="flex flex-col gap-8">
          
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
                 <div class="w-12 h-12 rounded-full bg-white border-2 border-slate-100 text-slate-600 flex items-center justify-center group-hover:border-slate-300 transition-colors">
                    <Users class="w-5 h-5" />
                 </div>
                 <span class="text-xs font-bold text-slate-700">Supplier</span>
              </button>
            </div>
          </div>

          <!-- 5. Recent POs "PO Terbaru" -->
          <div class="flex-1 bg-white rounded-3xl shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-emerald-50 p-6">
            <div class="flex justify-between items-center mb-6">
              <h2 class="m-0 text-lg font-bold text-slate-800">PO Terbaru</h2>
              <button class="text-emerald-600 font-bold text-sm hover:underline" @click="router.push('/admin/po')">Lihat Semua</button>
            </div>
            
            <div class="flex flex-col gap-4">
              <div v-if="recentPOs.length === 0" class="text-center py-8 text-slate-400 text-sm">
                Belum ada PO terbaru.
              </div>
              <div 
                v-for="po in recentPOs" 
                :key="po.id"
                class="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group"
                @click="router.push(`/admin/po/${po.id}`)"
              >
                <div class="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:scale-105 transition-transform">
                  <FileText class="w-6 h-6" />
                </div>
                <div class="flex-1">
                  <h4 class="m-0 text-sm font-bold text-slate-800">{{ po.po_number }}</h4>
                  <p class="m-0 text-xs text-slate-500">Estimasi: Rp {{ formatFullCurrency(po.total_estimasi) }}</p>
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
  Users 
} from 'lucide-vue-next';

const router = useRouter(); // Initialize router

const authStore = useAuthStore();
const stats = ref({ total: 0, pending: 0, approved: 0, total_estimasi: 0 });
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
    const results = await Promise.allSettled([
      api.get('/po'), // Fetch all/recent POs to filter client-side
      api.get('/po/stats/daily'),
    ]);

    const [poListRes, dailyRes] = results;

    // 1. Process PO List for "Today's Stats"
    if (poListRes.status === 'fulfilled' && poListRes.value.data.success) {
      const allPOs = poListRes.value.data.data;
      
      // Filter for Today
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const todayPOs = allPOs.filter((po: any) => {
        const poDate = new Date(po.created_at).toISOString().split('T')[0];
        return poDate === today;
      });

      // Calculate Stats
      const total = todayPOs.length;
      const pending = todayPOs.filter((po: any) => po.status === 'MENUNGGU_APPROVAL').length;
      const approved = todayPOs.filter((po: any) => 
        ['APPROVED', 'APPROVED_KEUANGAN', 'DANA_DITRANSFER', 'BELANJA_SELESAI', 'CLOSED'].includes(po.status)
      ).length;
      const total_estimasi = todayPOs.reduce((sum: number, po: any) => sum + (Number(po.total_estimasi) || 0), 0);

      stats.value = {
        total,
        pending,
        approved,
        total_estimasi
      };

      recentPOs.value = allPOs.slice(0, 3);
    } else {
      console.error('Failed to fetch PO list');
    }
    
    // 2. Handle Daily Chart (Last 7 Days)
    if (dailyRes.status === 'fulfilled' && dailyRes.value.data.success) {
      const rawData = dailyRes.value.data.data;
      dailyStats.value = processLast7Days(rawData);
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
  if (amount >= 1000000000) {
    return (amount / 1000000000).toFixed(1) + 'M';
  } else if (amount >= 1000000) {
    return (amount / 1000000).toFixed(1) + 'Jt';
  }
  return amount.toLocaleString('id-ID');
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
</script>

<style>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
