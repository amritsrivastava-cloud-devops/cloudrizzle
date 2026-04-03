import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../utils/api';

// ─── Auth Store ───────────────────────────────────────────────────────────────
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken, isLoading: false });
          api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          return { success: false, error: err.response?.data?.error || 'Login failed' };
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/register', { name, email, password });
          set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken, isLoading: false });
          api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          return { success: false, error: err.response?.data?.error || 'Registration failed' };
        }
      },

      logout: async () => {
        try { await api.post('/auth/logout'); } catch (_) {}
        delete api.defaults.headers.common['Authorization'];
        set({ user: null, accessToken: null, refreshToken: null });
      },

      setToken: (token) => {
        set({ accessToken: token });
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    }),
    { name: 'auth-store', partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken }) }
  )
);

// ─── Cloud Store ─────────────────────────────────────────────────────────────
export const useCloudStore = create((set, get) => ({
  accounts: [],
  summary: null,
  isLoading: false,

  fetchAccounts: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/cloud/accounts');
      set({ accounts: data.accounts, isLoading: false });
    } catch (_) { set({ isLoading: false }); }
  },

  fetchSummary: async () => {
    try {
      const { data } = await api.get('/cloud/summary');
      set({ summary: data });
    } catch (_) {}
  },

  addAccount: async (accountData) => {
    try {
      const { data } = await api.post('/cloud/accounts', accountData);
      set(s => ({ accounts: [...s.accounts, data.account] }));
      return { success: true, account: data.account };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to add account' };
    }
  },

  removeAccount: async (id) => {
    try {
      await api.delete(`/cloud/accounts/${id}`);
      set(s => ({ accounts: s.accounts.filter(a => a.id !== id) }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  }
}));

// ─── Projects Store ───────────────────────────────────────────────────────────
export const useProjectStore = create((set) => ({
  projects: [],
  isLoading: false,

  fetchProjects: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/projects');
      set({ projects: data.projects, isLoading: false });
    } catch (_) { set({ isLoading: false }); }
  },

  createProject: async (projectData) => {
    try {
      const { data } = await api.post('/projects', projectData);
      set(s => ({ projects: [data.project, ...s.projects] }));
      return { success: true, project: data.project };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  },

  deleteProject: async (id) => {
    try {
      await api.delete(`/projects/${id}`);
      set(s => ({ projects: s.projects.filter(p => p.id !== id) }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error };
    }
  }
}));

// ─── UI Store ─────────────────────────────────────────────────────────────────
export const useUIStore = create((set) => ({
  sidebarCollapsed: false,
  activeModal: null,
  notifications: [],
  liveMetrics: null,

  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  openModal: (name) => set({ activeModal: name }),
  closeModal: () => set({ activeModal: null }),

  addNotification: (notification) => {
    const id = Date.now().toString();
    set(s => ({ notifications: [{ id, ...notification }, ...s.notifications].slice(0, 50) }));
    if (notification.autoClose !== false) {
      setTimeout(() => set(s => ({ notifications: s.notifications.filter(n => n.id !== id) })), 5000);
    }
  },

  dismissNotification: (id) => set(s => ({ notifications: s.notifications.filter(n => n.id !== id) })),

  setLiveMetrics: (metrics) => set({ liveMetrics: metrics })
}));
