import apiClient from './client'

export const getDiagramAPI = async (id) => {
  return apiClient.get(`/diagrams/${id}`)
}

export const updateDiagramAPI = async (id, data) => {
  // data gồm: canvasState (nodes, edges), zoomLevel, panX, panY, name
  return apiClient.put(`/diagrams/${id}`, data)
}

export const createDiagramAPI = async (projectId, name) => {
  return apiClient.post(`/projects/${projectId}/diagrams`, { name })
}

export const deleteDiagramAPI = async (id) => {
  return apiClient.delete(`/diagrams/${id}`)
}
