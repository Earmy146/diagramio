import apiClient from './client'

export const getVersionsAPI = async (projectId) => {
  return apiClient.get(`/versions/project/${projectId}`)
}

export const createVersionAPI = async (projectId, snapshot, message = '') => {
  return apiClient.post(`/versions/project/${projectId}`, { snapshot, message })
}

export const getVersionDetailAPI = async (versionId) => {
  return apiClient.get(`/versions/detail/${versionId}`)
}

export const getTemplatesAPI = async () => {
  return apiClient.get('/versions/templates')
}
