import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../services/api';
import type { User, LoginResponse } from '../types';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!token.value);
  const userRole = computed(() => user.value?.role);

  // Initialize from localStorage
  function init() {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      token.value = savedToken;
      user.value = JSON.parse(savedUser);
    }
  }

  async function login(username: string, password: string) {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.post<LoginResponse>('/auth/login', {
        username,
        password
      });

      if (response.data.success) {
        token.value = response.data.data.token;
        user.value = response.data.data.user;

        // Save to localStorage
        localStorage.setItem('token', token.value);
        localStorage.setItem('user', JSON.stringify(user.value));

        return true;
      } else {
        error.value = response.data.message;
        return false;
      }
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Login failed';
      return false;
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    userRole,
    init,
    login,
    logout
  };
});
