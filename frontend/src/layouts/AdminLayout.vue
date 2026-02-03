
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { 
  LayoutDashboard, 
  FilePlus, 
  ClipboardList, 
  BarChart3, 
  Clock, 
  History, 
  Send, 
  ShoppingCart, 
  User,
  LogOut,
  Store
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const isSidebarOpen = ref(false);

function isItemActive(item: MenuItem) {
  // Check if paths match first
  if (route.path !== item.path.split('?')[0]) {
    return false;
  }
  
  // If item path has query params, verify they match
  if (item.path.includes('?')) {
    const itemQuery = new URLSearchParams(item.path.split('?')[1]);
    
    // Check if tab param matches
    if (itemQuery.has('tab')) {
      return route.query.tab === itemQuery.get('tab');
    }
  } else {
    if (route.path === '/approval' || route.path === '/transfer' || route.path === '/shopping') {
       if (route.query.tab === 'history') return false;
    }
  }
  
  return true;
}

type MenuGroup = {
  type: 'group';
  label: string;
};

type MenuItem = {
  type: 'item';
  label: string;
  path: string;
  icon: any;
};

type MenuEntry = MenuGroup | MenuItem;

const menus: Record<string, MenuEntry[]> = {
  ADMIN: [
    { type: 'item', label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { type: 'group', label: 'Master Data' },
    { type: 'item', label: 'Master Dapur', path: '/dapur', icon: Store },
    { type: 'group', label: 'Procurement' },
    { type: 'item', label: 'Buat PO', path: '/po/create', icon: FilePlus },
    { type: 'item', label: 'Daftar PO', path: '/po', icon: ClipboardList },
    { type: 'group', label: 'Reports' },
    { type: 'item', label: 'Laporan', path: '/reports', icon: BarChart3 },
  ],
  MANAJER: [
    { type: 'item', label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { type: 'item', label: 'Daftar PO', path: '/po', icon: ClipboardList },
    { type: 'group', label: 'Approvals' },
    { type: 'item', label: 'Pending Approval', path: '/approval', icon: Clock },
    { type: 'item', label: 'Riwayat', path: '/approval?tab=history', icon: History },
  ],
  KEUANGAN: [
    { type: 'item', label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { type: 'group', label: 'Finance' },
    { type: 'item', label: 'Transfer Dana', path: '/transfer', icon: Send },
    { type: 'item', label: 'Riwayat Transfer', path: '/transfer?tab=history', icon: History },
    { type: 'item', label: 'Laporan', path: '/reports', icon: BarChart3 },
  ],
  LAPANGAN: [
    { type: 'item', label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { type: 'group', label: 'Operations' },
    { type: 'item', label: 'Belanja', path: '/shopping', icon: ShoppingCart },
    { type: 'item', label: 'Riwayat', path: '/shopping?tab=history', icon: History },
  ]
};

const currentMenus = computed(() => {
  const role = authStore.userRole;
  return role ? menus[role] || [] : [];
});

function handleLogout() {
  authStore.logout();
  router.push('/login');
}
</script>

<template>
  <div class="min-h-screen bg-[#F0FDF4] flex flex-col md:flex-row font-inter">
    
    <!-- Mobile Sidebar Overlay -->
    <div 
      v-if="isSidebarOpen" 
      class="fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity duration-300 backdrop-blur-sm"
      @click="isSidebarOpen = false"
    ></div>

    <!-- Sidebar -->
    <aside 
      class="fixed top-0 left-0 bottom-0 w-[280px] bg-white border-r border-emerald-100 z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen md:sticky overflow-y-auto shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <!-- Logo Area -->
      <div class="h-24 flex items-center px-8 border-b border-emerald-50 bg-gradient-to-b from-white to-emerald-50/30">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-500/20">
            S
          </div>
          <div>
            <h1 class="m-0 text-lg font-bold text-slate-800 tracking-tight">SPPI <span class="text-emerald-600">Admin</span></h1>
            <p class="m-0 text-[11px] text-slate-400 font-semibold tracking-wider uppercase">PO Sayuran Management</p>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="p-6 flex flex-col gap-1.5">
        <template v-for="(item, index) in currentMenus" :key="index">
          <!-- Group Header -->
          <div v-if="item.type === 'group'" class="mt-6 mb-3 px-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
            {{ item.label }}
          </div>

          <!-- Menu Item -->
          <router-link 
            v-else
            :to="item.path" 
            class="group flex items-center gap-3.5 px-4 py-3.5 no-underline font-medium rounded-xl transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-600" 
            :class="isItemActive(item) ? 'bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-100/50' : 'text-slate-500'"
            @click="isSidebarOpen = false"
          >
            <component 
              :is="item.icon" 
              class="w-5 h-5 group-hover:scale-110 transition-transform duration-200 opacity-80" 
              :class="isItemActive(item) ? 'opacity-100' : ''" 
            />
            <span class="text-[14px] font-semibold">{{ item.label }}</span>
            
            <!-- Active Indicator (Right Border) -->
            <div class="ml-auto w-1 h-1 rounded-full bg-emerald-500 transition-opacity duration-200" :class="isItemActive(item) ? 'opacity-100' : 'opacity-0'"></div>
          </router-link>
        </template>
      </nav>
      
      <!-- User Profile (Mobile/Sidebar Bottom) -->
      <div class="mt-auto p-6 border-t border-emerald-50 mx-2 mb-2">
        <div class="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-50/50 border border-emerald-100/50">
          <div class="w-10 h-10 rounded-full bg-white flex items-center justify-center text-lg shadow-sm ring-2 ring-white">
            <User class="w-5 h-5 text-emerald-600" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="m-0 text-sm font-bold text-slate-800 truncate">{{ authStore.user?.nama_lengkap || 'Admin User' }}</p>
            <p class="m-0 text-xs text-slate-500 truncate capitalize">{{ authStore.userRole?.toLowerCase() || 'Role' }}</p>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content Wrapper -->
    <div class="flex-1 flex flex-col min-w-0 bg-[#F0FDF4]/30">
      
      <!-- Top Header -->
      <header class="h-20 bg-white/80 backdrop-blur-xl border-b border-emerald-100/50 sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between shadow-[0_4px_20px_-10px_rgba(0,0,0,0.02)]">
        <div class="flex items-center gap-4">
          <!-- Mobile Toggle -->
          <button 
            @click="isSidebarOpen = !isSidebarOpen"
            class="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          
          <!-- Breadcrumb / Page Title -->
          <div class="hidden md:flex flex-col">
            <span class="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-0.5">Overview</span>
            <h2 class="m-0 text-xl font-bold text-slate-800 tracking-tight">Dashboard</h2>
          </div>
        </div>

        <div class="flex items-center gap-6">
          <!-- Notification Bell -->
          <button class="relative p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            <span class="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          <!-- Logout Button -->
          <button @click="handleLogout" class="hidden md:flex px-4 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-xl cursor-pointer text-xs font-bold transition-all duration-200 items-center gap-2 shadow-sm hover:shadow-md">
            <LogOut class="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 p-4 md:p-8 overflow-x-hidden">
        <slot />
      </main>
    </div>

  </div>
</template>
