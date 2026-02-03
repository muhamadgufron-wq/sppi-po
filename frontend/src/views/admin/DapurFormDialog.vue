<template>
  <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_0.3s_ease-out]">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto transform transition-all scale-100 border border-slate-100">
      
      <!-- Header -->
      <div class="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/50 to-white sticky top-0 z-10 backdrop-blur-md">
        <div>
          <h2 class="text-xl font-bold text-slate-800 tracking-tight">
            {{ isEdit ? 'Edit Data Dapur' : 'Tambah Dapur Baru' }}
          </h2>
          <p class="text-xs text-slate-500 font-medium mt-0.5">
            {{ isEdit ? 'Perbarui informasi dapur dan lokasi.' : 'Isi form di bawah untuk mendaftarkan dapur.' }}
          </p>
        </div>
        <button 
          @click="$emit('close')" 
          class="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="p-6 space-y-5">
        
        <!-- Kode & Status Row -->
        <div class="grid grid-cols-2 gap-5">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Kode Dapur <span class="text-red-500">*</span>
            </label>
            <input 
              v-model="form.kode_dapur" 
              type="text"
              required
              placeholder="Ex: DPR-001"
              class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-semibold text-slate-700 placeholder:text-slate-400 text-sm"
            />
          </div>
          
          <div v-if="isEdit">
            <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Status
            </label>
            <select 
              v-model="form.is_active" 
              class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-semibold text-slate-700 text-sm appearance-none"
            >
              <option :value="1">🟢 Aktif</option>
              <option :value="0">🔴 Non-aktif</option>
            </select>
          </div>
        </div>

        <!-- Nama Dapur -->
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
            Nama Dapur <span class="text-red-500">*</span>
          </label>
          <input 
            v-model="form.nama_dapur" 
            type="text"
            required
            placeholder="Contoh: Dapur Pusat - Jakarta Selatan"
            class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-bold text-slate-800 placeholder:text-slate-400"
          />
        </div>

        <!-- Lokasi -->
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
            Alamat / Lokasi
          </label>
          <textarea 
            v-model="form.lokasi" 
            rows="2"
            placeholder="Alamat lengkap lokasi dapur..."
            class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm text-slate-700 placeholder:text-slate-400 resize-none"
          ></textarea>
        </div>

        <div class="border-t border-slate-100 my-4"></div>

        <!-- Kontak PIC Section -->
        <div>
            <h4 class="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
               <UserCircle2 class="w-4 h-4 text-emerald-600" /> Kontak Penanggung Jawab
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                  <label class="block text-xs font-semibold text-slate-500 mb-1.5">Nama PIC</label>
                  <input 
                    v-model="form.pic_name" 
                    type="text"
                    placeholder="Nama lengkap"
                    class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm"
                  />
               </div>
               <div>
                  <label class="block text-xs font-semibold text-slate-500 mb-1.5">No. Telepon</label>
                  <input 
                    v-model="form.pic_phone" 
                    type="tel"
                    placeholder="08..."
                    class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm"
                  />
               </div>
            </div>
        </div>

        <!-- Keterangan -->
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
            Catatan Tambahan
          </label>
          <textarea 
            v-model="form.keterangan" 
            rows="2"
            placeholder="Info operasional atau catatan khusus..."
            class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm text-slate-700 placeholder:text-slate-400 resize-none"
          ></textarea>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
          <button 
            type="button"
            @click="$emit('close')" 
            class="px-5 py-2.5 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 transition-all font-bold text-sm"
          >
            Batal
          </button>
          <button 
            type="submit"
            :disabled="submitting"
            class="px-6 py-2.5 text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 hover:-translate-y-0.5 hover:shadow-xl transition-all font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Loader2 v-if="submitting" class="w-4 h-4 animate-spin" />
            <Save v-else class="w-4 h-4" />
            <span>{{ isEdit ? 'Simpan Perubahan' : 'Simpan Dapur' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { X, UserCircle2, Loader2, Save } from 'lucide-vue-next';
import Swal from 'sweetalert2';
import api from '../../services/api';

interface Dapur {
  id?: number;
  kode_dapur: string;
  nama_dapur: string;
  lokasi?: string;
  pic_name?: string;
  pic_phone?: string;
  is_active?: number;
  keterangan?: string;
}

const props = defineProps<{
  dapur?: Dapur | null;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const isEdit = computed(() => !!props.dapur);
const submitting = ref(false);

const form = ref<Dapur>({
  kode_dapur: '',
  nama_dapur: '',
  lokasi: '',
  pic_name: '',
  pic_phone: '',
  is_active: 1,
  keterangan: ''
});

async function handleSubmit() {
  submitting.value = true;
  
  try {
    if (isEdit.value) {
      // Update existing
      await api.put(`/dapur/${props.dapur!.id}`, form.value);
      
      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Data dapur berhasil diperbarui.',
        timer: 1500,
        showConfirmButton: false,
        confirmButtonColor: '#10b981'
      });
    } else {
      // Create new
      await api.post('/dapur', form.value);
      
      await Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Dapur baru berhasil ditambahkan.',
        timer: 1500,
        showConfirmButton: false,
        confirmButtonColor: '#10b981'
      });
    }
    
    emit('saved');
    emit('close');
  } catch (error: any) {
    Swal.fire({
      icon: 'error',
      title: 'Gagal',
      text: error.response?.data?.message || 'Terjadi kesalahan saat menyimpan data.',
      confirmButtonColor: '#ef4444'
    });
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  if (props.dapur) {
    form.value = { ...props.dapur };
  }
});
</script>
