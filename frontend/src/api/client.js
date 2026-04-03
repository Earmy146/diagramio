import axios from 'axios'
import useAuthStore from '../stores/useAuthStore'

// Base instance — dùng URL tương đối để Vite proxy tự forward sang backend port 4000
const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true, // Quan trọng: Bắt buộc gửi Cookie (Refresh Token + Guest Token)
})

// Request interceptor: Attach Access Token
apiClient.interceptors.request.use(
  (config) => {
    // Lấy accessToken từ Zustand store (không parse localStorage trực tiếp vì Zustand handle)
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: Handle Unauthorized (401) & Auto Refresh Token
apiClient.interceptors.response.use(
  (response) => {
    // Backend bọc data trong `data` property, axios có `.data` nữa nên trả về `response.data`
    return response.data
  },
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Cố gắng lấy lại token mới từ cookie chứa refresh_token
        const refreshRes = await axios.post(
          'http://localhost:4000/api/auth/refresh',
          {},
          { withCredentials: true }
        )

        const newAccessToken = refreshRes.data.data.accessToken
        useAuthStore.getState().setAccessToken(newAccessToken)

        // Thực hiện lại request ban đầu với token mới
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        const newResponse = await axios(originalRequest)
        return newResponse.data
      } catch (refreshError) {
        // Refresh token hỏng/hết hạn -> Logout
        useAuthStore.getState().logout()
        return Promise.reject(refreshError?.response?.data || refreshError)
      }
    }

    // Pass along mọi lỗi khác nhưng pass body lỗi của backend
    if (error.response?.data) {
      return Promise.reject(error.response.data)
    }
    return Promise.reject(error)
  }
)

export default apiClient
