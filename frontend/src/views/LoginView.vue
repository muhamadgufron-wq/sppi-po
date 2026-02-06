
<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const username = ref('');
const password = ref('');



function fillCredentials(u: string, p: string) {
  username.value = u;
  password.value = p;
}

async function handleLogin() {
  const success = await authStore.login(username.value, password.value);
  
  if (success) {
    router.push('/dashboard');
  }
}
</script>

<style>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}
.glass-panel {
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.18);
}
</style>

<template>
  <div class="min-h-screen w-full flex bg-white font-inter">
    
    <!-- Left Side: Image (Hidden on mobile) -->
    <div class="hidden lg:block lg:w-1/2 p-4">
      <div class="w-full h-full rounded-[32px] overflow-hidden relative bg-slate-900">
        <!-- Placeholder Image using gradient and pattern if real image fails -->
        <div class="absolute inset-0 bg-gradient-to-br from-emerald-600 to-teal-800 mix-blend-multiply opacity-90 z-10"></div>
        <img 
          src="/images/photo-1542838132-92c53300491e.avif" 
          alt="Fresh Vegetables" 
          class="w-full h-full object-cover"
        />
        
        <!-- Content Overlay -->
        <div class="absolute inset-0 z-20 flex flex-col justify-end p-12 text-white">
          <div class="glass-panel p-8 rounded-3xl border border-white/10 backdrop-blur-md bg-white/10 mb-8 max-w-lg">
             <h2 class="text-3xl font-bold mb-4 leading-tight">Sederhanakan Proses Pengajuan dan Pembelian</h2>
             <p class="text-white/80 text-lg leading-relaxed">
                Tidak perlu lagi pencatatan manual atau komunikasi terpisah. Semua pengajuan, persetujuan, dan pelacakan pembelian ada dalam satu sistem.
             </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Side: Login Form -->
    <div class="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
      <div class="w-full max-w-[420px] animate-[fadeIn_0.5s_ease-out]">
        
        <!-- Mobile Logo (visible only on small screens) -->
        <div class="lg:hidden mb-8 flex flex-col items-center">
          <div class="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold mb-3 shadow-lg shadow-emerald-200">S</div>
          <h1 class="text-xl font-bold text-slate-800">SPPI Admin</h1>
        </div>

        <!-- Header -->
        <div class="text-center lg:text-left mb-10">
          <h2 class="text-3xl font-bold text-slate-900 mb-2 text-center">Akses Sistem</h2>
          <p class="text-slate-500 text-[15px] text-center">Masuk menggunakan akun resmi perusahaan.</p>
        </div>

        <form @submit.prevent="handleLogin" class="flex flex-col gap-5">
          
          <!-- Username Input -->
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-2 ml-1" for="username">Username</label>
            <div class="relative">
              <input
                id="username"
                v-model="username"
                type="text"
                placeholder="Enter your username"
                required
                class="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
              />
            </div>
          </div>

          <!-- Password Input -->
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-2 ml-1" for="password">Password</label>
             <div class="relative">
               <input
                id="password"
                v-model="password"
                type="password"
                placeholder="••••••••"
                required
                class="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-base font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-mono tracking-widest"
              />
            </div>
          </div>

          <!-- Remember Me & Forgot Password -->
          <div class="flex items-center justify-between text-sm">
            <label class="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" class="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
              <span class="text-slate-500 group-hover:text-slate-700 font-medium transition-colors">Ingat saya</span>
            </label>
            <a href="#" class="text-emerald-600 font-bold hover:text-emerald-700 hover:underline">Lupa Password?</a>
          </div>

          <!-- Error Message -->
          <div v-if="authStore.error" class="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-center gap-2 animate-[shake_0.4s_ease-in-out]">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            {{ authStore.error }}
          </div>

          <!-- Submit Button -->
          <button 
            type="submit" 
            :disabled="authStore.loading"
            class="w-full h-12 bg-emerald-600 text-white rounded-xl font-bold text-[15px] shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 hover:translate-y-[-1px] active:translate-y-[1px] disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2"
          >
            <span v-if="authStore.loading" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            {{ authStore.loading ? 'Memuat...' : 'Masuk' }}
          </button>

          <!-- Divider -->
          <div class="relative py-4">
             <div class="absolute inset-0 flex items-center"><span class="w-full border-t border-slate-100"></span></div>
             <div class="relative flex justify-center text-xs uppercase"><span class="bg-white px-2 text-slate-400 font-bold tracking-wider">Demo Accounts</span></div>
          </div>

          <!-- Demo Accounts -->
          <div class="grid grid-cols-2 gap-3">
             <div 
               v-for="(role, i) in ['admin', 'manajer', 'keuangan', 'shopper']" :key="i"
               class="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-emerald-200 cursor-pointer transition-all group"
               @click="fillCredentials(role, 'admin123')"
             >
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 group-hover:text-emerald-600 transition-colors">{{ role }}</div>
                <div class="text-xs font-mono text-slate-600 font-semibold truncate">{{ role }} / admin123</div>
             </div>
          </div>

        </form>

        <p class="mt-8 text-center text-sm text-slate-400">
          Don't have an account? <span class="text-slate-900 font-bold cursor-pointer hover:underline">Contact Support</span>
        </p>

      </div>
    </div>

  </div>
</template>
