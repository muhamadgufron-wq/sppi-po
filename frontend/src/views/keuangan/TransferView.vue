<template>
  <div class="min-h-screen bg-gradient-to-br from-[#f5f7fa] to-[#c3cfe2]">
    <nav class="bg-white shadow-sm py-4">
      <div class="max-w-[1200px] mx-auto px-6 flex justify-between items-center">
        <router-link to="/dashboard" class="text-[#667eea] font-semibold no-underline hover:text-[#5a6fd6]">← Dashboard</router-link>
        <h2 class="text-lg font-bold text-slate-800 m-0">Transfer - Keuangan</h2>
        <button @click="handleLogout" class="bg-gradient-to-br from-[#f093fb] to-[#f5576c] text-white border-0 py-2 px-4 rounded-lg font-semibold cursor-pointer transition-transform hover:-translate-y-0.5 shadow-md hover:shadow-lg">Logout</button>
      </div>
    </nav>

    <div class="max-w-[1200px] mx-auto p-8">
      <h1 class="text-3xl font-bold text-slate-800 mb-2">Process Transfers</h1>
      <p class="text-slate-500 mb-8">Transfer dana untuk PO yang sudah approved</p>

      <div v-if="loading" class="text-center p-12 bg-white rounded-2xl shadow-sm text-slate-500">Loading...</div>
      <div v-else-if="pos.length === 0" class="text-center p-12 bg-white rounded-2xl shadow-sm text-slate-500">
        No pending transfers
      </div>
      <div v-else class="grid gap-4">
        <div v-for="po in pos" :key="po.id" class="bg-white p-6 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <h3 class="text-lg font-bold text-slate-800 m-0 mb-2">{{ po.po_number }}</h3>
          <p class="text-slate-500 m-0 mb-4">Total: Rp {{ formatCurrency(po.total_estimasi) }}</p>
          <button @click="processTransfer(po)" class="bg-[#667eea] text-white border-0 py-2.5 px-5 rounded-lg font-semibold cursor-pointer transition-all hover:bg-[#5a6fd6] hover:-translate-y-0.5 shadow-sm">Process Transfer</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import api from '../../services/api';
import type { PurchaseOrder } from '../../types';

const router = useRouter();
const authStore = useAuthStore();
const pos = ref<PurchaseOrder[]>([]);
const loading = ref(false);

onMounted(() => {
  loadPendingTransfers();
});

async function loadPendingTransfers() {
  loading.value = true;
  try {
    const response = await api.get('/transfer/pending');
    if (response.data.success) {
      pos.value = response.data.data;
    }
  } catch (error) {
    console.error('Failed to load:', error);
  } finally {
    loading.value = false;
  }
}

async function processTransfer(po: PurchaseOrder) {
  const nominal = prompt(`Transfer amount for ${po.po_number}:`, po.total_estimasi.toString());
  if (!nominal) return;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*,application/pdf';
  
  fileInput.onchange = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('nominal_transfer', nominal);
    formData.append('tanggal_transfer', new Date().toISOString().split('T')[0]);
    formData.append('bukti_transfer', file);

    try {
      await api.post(`/transfer/${po.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Transfer processed!');
      loadPendingTransfers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed');
    }
  };

  fileInput.click();
}

function handleLogout() {
  authStore.logout();
  router.push('/login');
}

function formatCurrency(amount: number) {
  return amount.toLocaleString('id-ID');
}
</script>
