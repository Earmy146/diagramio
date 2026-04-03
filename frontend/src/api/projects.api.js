import apiClient from './client'

export const getProjectsAPI = async () => {
  return apiClient.get('/projects')
}

export const getProjectDetailAPI = async (projectId) => {
  return apiClient.get(`/projects/${projectId}`)
}

export const createProjectAPI = async (name, description, isPublic = false) => {
  return apiClient.post('/projects', { name, description, isPublic })
}

export const updateProjectAPI = async (projectId, data) => {
  return apiClient.patch(`/projects/${projectId}`, data)
}

export const deleteProjectAPI = async (projectId) => {
  return apiClient.delete(`/projects/${projectId}`)
}

export const claimProjectsAPI = async () => {
  return apiClient.post('/projects/claim')
}
