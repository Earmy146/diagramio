import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Store quản lý auth state: user info và access token
 */
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,

      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      login: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),

      isAuthenticated: () => {
        const state = useAuthStore.getState()
        return !!state.token && !!state.user
      },
    }),
    {
      name: 'diagramio-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
)
