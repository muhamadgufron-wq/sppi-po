import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { UserRole } from '../types';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      redirect: '/dashboard'
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: { requiresAuth: true, layout: 'admin' }
    },
    // Admin routes
    {
      path: '/dapur',
      name: 'dapur-list',
      component: () => import('../views/admin/DapurListView.vue'),
      meta: { requiresAuth: true, roles: [UserRole.ADMIN], layout: 'admin' }
    },
    {
      path: '/po/create',
      name: 'create-po',
      component: () => import('../views/admin/CreatePOView.vue'),
      meta: { requiresAuth: true, roles: [UserRole.ADMIN], layout: 'admin' }
    },
    {
      path: '/po',
      name: 'po-list',
      component: () => import('../views/admin/POListView.vue'),
      meta: { requiresAuth: true, roles: [UserRole.ADMIN, UserRole.MANAJER], layout: 'admin' }
    },
    {
      path: '/po/:id',
      name: 'po-detail',
      component: () => import('../views/admin/PODetailView.vue'),
      meta: { requiresAuth: true, layout: 'admin' }
    },
    // Manajer routes
    {
      path: '/approval',
      name: 'approval',
      component: () => import('../views/manajer/ApprovalView.vue'),
      meta: { requiresAuth: true, roles: [UserRole.MANAJER], layout: 'admin' }
    },
    // Keuangan routes
    {
      path: '/transfer',
      name: 'transfer',
      component: () => import('../views/keuangan/TransferView.vue'),
      meta: { requiresAuth: true, roles: [UserRole.KEUANGAN], layout: 'admin' }
    },
    // Purchasing routes
    {
      path: '/shopping',
      name: 'shopping',
      component: () => import('../views/purchasing/ShoppingView.vue'),
      meta: { requiresAuth: true, roles: [UserRole.PURCHASING], layout: 'admin' }
    }
  ]
});

// Navigation guard
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();
  const requiresAuth = to.meta.requiresAuth !== false;
  const requiredRoles = to.meta.roles as UserRole[] | undefined;

  if (requiresAuth && !authStore.isAuthenticated) {
    // Not logged in, redirect to login
    next('/login');
  } else if (requiredRoles && !requiredRoles.includes(authStore.userRole!)) {
    // User doesn't have required role
    next('/dashboard');
  } else {
    next();
  }
});

export default router;
