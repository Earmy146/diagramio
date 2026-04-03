import apiClient from './client'

export const loginAPI = async (email, password) => {
  return apiClient.post('/auth/login', { email, password })
}

export const registerAPI = async (username, email, password) => {
  return apiClient.post('/auth/register', { username, email, password })
}

export const getMeAPI = async () => {
  return apiClient.get('/auth/me')
}

export const logoutAPI = async () => {
  return apiClient.post('/auth/logout')
}

export const checkEmailAPI = async (email) => {
  return apiClient.get(`/auth/check-email?email=${encodeURIComponent(email)}`)
}
