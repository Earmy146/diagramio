import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Quản lý Authentication state
const useAuthStore = create(
  persist(
    (set) => ({
      user: null,         // Null nghĩa là chưa đăng nhập (hoặc là guest theo session backend)
      accessToken: null,  // Lưu Token
      isAuthReady: false, // Cờ kiểm tra trạng thái khởi tạo hoàn tất chưa

      setAuth: (user, accessToken) => set({ user, accessToken, isAuthReady: true }),
      setAccessToken: (accessToken) => set({ accessToken }),
      logout: () => set({ user: null, accessToken: null, isAuthReady: true }),
      setAuthReady: () => set({ isAuthReady: true })
    }),
    {
      name: 'diagramio-auth',
    }
  )
)

export default useAuthStore
