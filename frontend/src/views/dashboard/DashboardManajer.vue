<template>
  <div class="animate-[fadeIn_0.5s_ease-out]">
    <div class="max-w-[1600px] mx-auto">
      
      <!-- 1. Header Section -->
      <div class="mb-6">
        <h1 class="m-0 text-xl md:text-2xl font-bold text-slate-800 tracking-tight">Halo, {{ authStore.user?.nama_lengkap || 'Manajer' }}</h1>
        <p class="m-0 mt-1 text-sm text-slate-500 font-medium">Ringkasan persetujuan PO bulan ini.</p>
      </div>

      <!-- Main Grid -->
      <div class="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6 items-start">
        
        <!-- Left Column (Stats & Chart) -->
        <div class="flex flex-col gap-6">
          
          <!-- 2. Stats Grid -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Menunggu Approval -->
            <div class="bg-white p-4 rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.04)] hover:shadow-lg transition-shadow border border-emerald-50 relative overflow-hidden group cursor-pointer" @click="router.push('/approval')">
              <div class="flex flex-col h-full justify-between relative z-10">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                    <Clock class="w-4 h-4" />
                  </div>
                  <p class="m-0 text-[10px] font-bold text-slate-400 uppercase tracking-wider">MENUNGGU APPROVAL</p>
                </div>
                <h3 class="text-xl md:text-2xl font-bold text-slate-800 m-0 text-right mt-2">{{ stats.pending }}</h3>
                <div v-if="stats.pending > 0" class="absolute bottom-1 left-0 text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-bold">
                  Action Needed
                </div>
              </div>
            </div>

            <!-- Approved This Month -->
            <div class="bg-white p-4 rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.04)] hover:shadow-lg transition-shadow border border-emerald-50 relative overflow-hidden group">
              <div class="flex flex-col h-full justify-between relative z-10">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <CheckCircle class="w-4 h-4" />
                  </div>
                  <p class="m-0 text-[10px] font-bold text-slate-400 uppercase tracking-wider">APPROVED (BLN INI)</p>
                </div>
                <h3 class="text-xl md:text-2xl font-bold text-slate-800 m-0 text-right mt-2">{{ stats.approvedMonth }}</h3>
              </div>
            </div>

            <!-- Total Nilai -->
            <div class="bg-white p-4 rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.04)] hover:shadow-lg transition-shadow border border-emerald-50 relative overflow-hidden group">
              <div class="flex flex-col h-full justify-between relative z-10">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <Banknote class="w-4 h-4" />
                  </div>
                  <p class="m-0 text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL NILAI (BLN INI)</p>
                </div>
                <h3 class="text-xl md:text-2xl font-bold text-slate-800 m-0 text-right mt-2">Rp {{ formatNumber(stats.totalValueMonth) }}</h3>
              </div>
            </div>
          </div>

          <!-- 3. Chart Section -->
          <div class="bg-white p-5 rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.04)] border border-slate-50">
            <div class="flex justify-between items-center mb-4">
              <div>
                <h2 class="m-0 text-base font-bold text-slate-800">Aktivitas PO Masuk</h2>
                <p class="m-0 text-[10px] text-slate-400">7 Hari Terakhir</p>
              </div>
            </div>
            <div class="h-[250px]">
               <DailyPOChart v-if="!loading && dailyStats.length > 0" :data="dailyStats" />
               <div v-else class="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                 <BarChart2 class="w-8 h-8 text-slate-300" />
                 <span class="text-xs">Memuat data grafik...</span>
               </div>
            </div>
          </div>

        </div>

        <!-- Right Column (Empty for now / Quick Actions) -->
        <div class="flex flex-col gap-6">
           <div class="bg-emerald-600 p-6 rounded-3xl shadow-lg shadow-emerald-200 text-white relative overflow-hidden group">
             <div class="relative z-10">
               <h3 class="text-lg font-bold mb-2">Butuh Bantuan?</h3>
               <p class="text-emerald-100 text-sm mb-4 leading-relaxed">
                 Jika ada kendala teknis atau pertanyaan mengenai PO, silakan hubungi admin.
               </p>
               <button class="bg-white text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-50 transition-colors">
                 Hubungi Admin
               </button>
             </div>
             <!-- Decor elements -->
             <div class="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-500 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
             <div class="absolute top-10 -right-10 w-20 h-20 bg-emerald-400 rounded-full opacity-30"></div>
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
  Clock, 
  CheckCircle, 
  Banknote, 
  BarChart2
} from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();
const loading = ref(false);

const stats = ref({
  pending: 0,
  approvedMonth: 0,
  totalValueMonth: 0
});

const dailyStats = ref<{ date: string; count: number }[]>([]);

onMounted(async () => {
  await fetchData();
});

// Auto-refresh automatically
useAutoRefresh(fetchData);

async function fetchData() {
  loading.value = true;
  try {
    const [poListRes, dailyRes] = await Promise.allSettled([
      api.get('/po'),
      api.get('/po/stats/daily')
    ]);

    // 1. Process PO List for Stats
    if (poListRes.status === 'fulfilled' && poListRes.value.data.success) {
      const allPOs = poListRes.value.data.data;
      
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      // Filter
      const pending = allPOs.filter((po: any) => po.status === 'MENUNGGU_APPROVAL').length;
      
      const approvedProps = ['APPROVED', 'APPROVED_KEUANGAN', 'DANA_DITRANSFER', 'BELANJA_SELESAI', 'CLOSED'];
      const approvedThisMonth = allPOs.filter((po: any) => {
        if (!approvedProps.includes(po.status)) return false;
        // Use approval date if available, else usage created_at as proxy or fallback
        // Assuming approved_at exists for approved POs
        const dateDate = po.approved_at ? new Date(po.approved_at) : new Date(po.created_at);
        return dateDate.getMonth() === currentMonth && dateDate.getFullYear() === currentYear;
      });

      const approvedMonthCount = approvedThisMonth.length;
      const totalValueMonth = approvedThisMonth.reduce((sum: number, po: any) => sum + (Number(po.total_estimasi) || 0), 0);

      stats.value = {
        pending,
        approvedMonth: approvedMonthCount,
        totalValueMonth
      };
    }

    // 2. Process Daily Chart
    if (dailyRes.status === 'fulfilled' && dailyRes.value.data.success) {
       const rawData = dailyRes.value.data.data;
       dailyStats.value = processLast7Days(rawData);
    }
    
  } catch (e) {
    console.error('Error fetching manager dashboard data', e);
  } finally {
    loading.value = false;
  }
}

function processLast7Days(data: { date: string; count: number }[]) {
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    
    // Use local YYYY-MM-DD format
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

function formatNumber(num: number) {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'M';
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'Jt';
  }
  return num.toLocaleString('id-ID');
}
</script>
