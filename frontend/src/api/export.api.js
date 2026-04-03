import apiClient from './client'

export const createShareLinkAPI = async (projectId, permission = 'VIEW', expiresInDays = null) => {
  return apiClient.post('/export/share', { projectId, permission, expiresInDays })
}

export const getSharedDataAPI = async (token) => {
  return apiClient.get(`/export/share/${token}`)
}
