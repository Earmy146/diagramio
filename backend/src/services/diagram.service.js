import prisma from '../config/prisma.js'

const makeError = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode })

/**
 * Kiểm tra quyền của requester đối với Project chứa Diagram này
 */
const verifyProjectAccessForDiagram = async (diagramId, userId, guestToken, requireOwnership = false) => {
  const diagram = await prisma.diagram.findUnique({
    where: { id: parseInt(diagramId) },
    include: { project: true }
  })

  if (!diagram) throw makeError('Diagram không tồn tại', 404)

  const p = diagram.project
  const isOwner = (userId && p.userId === userId) || (!p.userId && p.guestToken === guestToken)

  if (requireOwnership && !isOwner) {
    throw makeError('Bạn không có quyền chỉnh sửa Diagram thuộc dự án này', 403)
  }

  if (!isOwner && !p.isPublic) {
    throw makeError('Dự án này là riêng tư', 403)
  }

  return diagram
}

const verifyProjectOwnershipById = async (projectId, userId, guestToken) => {
  const p = await prisma.project.findUnique({ where: { id: parseInt(projectId) } })
  if (!p) throw makeError('Dự án không tồn tại', 404)

  const isOwner = (userId && p.userId === userId) || (!p.userId && p.guestToken === guestToken)
  if (!isOwner) throw makeError('Tạo Diagram bị từ chối: Bạn không phải chủ sở hữu dự án', 403)
  return p
}

export const createDiagram = async (projectId, data, userId, guestToken) => {
  await verifyProjectOwnershipById(projectId, userId, guestToken)

  const diagram = await prisma.diagram.create({
    data: {
      projectId: parseInt(projectId),
      name: data.name || 'Untitled Diagram',
      canvasState: data.canvasState || null
    }
  })

  return diagram
}

export const getDiagram = async (diagramId, userId, guestToken) => {
  const diagram = await verifyProjectAccessForDiagram(diagramId, userId, guestToken, false)
  
  // Trả về diagram (có thể kèm các bảng và cột nếu sau này cần load natives)
  // Nhưng hiện tại React Flow sẽ dùng canvasState
  return await prisma.diagram.findUnique({
    where: { id: parseInt(diagramId) },
    include: {
      erdTables: { include: { columns: true } },
      relationships: true,
      comments: true,
    }
  })
}

export const updateDiagram = async (diagramId, data, userId, guestToken) => {
  await verifyProjectAccessForDiagram(diagramId, userId, guestToken, true)

  const updateData = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.canvasState !== undefined) updateData.canvasState = data.canvasState
  if (data.zoomLevel !== undefined) updateData.zoomLevel = data.zoomLevel
  if (data.panX !== undefined) updateData.panX = data.panX
  if (data.panY !== undefined) updateData.panY = data.panY

  const updated = await prisma.diagram.update({
    where: { id: parseInt(diagramId) },
    data: updateData
  })

  return updated
}

export const deleteDiagram = async (diagramId, userId, guestToken) => {
  await verifyProjectAccessForDiagram(diagramId, userId, guestToken, true)

  await prisma.diagram.delete({
    where: { id: parseInt(diagramId) }
  })

  return true
}
