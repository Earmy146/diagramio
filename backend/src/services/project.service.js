import prisma from '../config/prisma.js'
import { createSlug } from '../utils/slug.js'

const makeError = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode })

/**
 * Kiểm tra quyền truy cập/sở hữu project
 */
const verifyProjectAccess = async (projectId, userId, guestToken, requireOwnership = false) => {
  const project = await prisma.project.findUnique({
    where: { id: parseInt(projectId) },
    include: { diagrams: true } // Include diagrams if we need to return it
  })

  if (!project) throw makeError('Dự án không tồn tại', 404)

  const isOwner = (userId && project.userId === userId) || (!project.userId && project.guestToken === guestToken)

  if (requireOwnership && !isOwner) {
    throw makeError('Bạn không có quyền thực hiện thao tác này trên dự án', 403)
  }

  if (!isOwner && !project.isPublic) {
    throw makeError('Dự án này ở chế độ riêng tư', 403)
  }

  return project
}

/**
 * Tạo project mới
 */
export const createProject = async ({ name, description, defaultDialect }, userId, guestToken) => {
  const slug = createSlug(name)
  
  const project = await prisma.project.create({
    data: {
      name,
      description,
      slug,
      defaultDialect: defaultDialect || 'MYSQL',
      userId: userId || null,
      guestToken: !userId ? guestToken : null,
      // Khi tạo project, tạo luôn 1 diagram mặc định
      diagrams: {
        create: {
          name: 'Main Diagram',
        }
      }
    },
    include: {
      diagrams: true
    }
  })

  return project
}

/**
 * Láy danh sách projects của user hoặc guest
 */
export const listProjects = async (userId, guestToken) => {
  const whereClause = userId 
    ? { userId } 
    : { userId: null, guestToken }

  const projects = await prisma.project.findMany({
    where: whereClause,
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: {
        select: { diagrams: true }
      }
    }
  })

  return projects
}

/**
 * Lấy chi tiết project (nếu công khai, ai cũng xem được, nếu riêng tư thì phải là chủ)
 */
export const getProject = async (projectId, userId, guestToken) => {
  return await verifyProjectAccess(projectId, userId, guestToken, false)
}

/**
 * Cập nhật project
 */
export const updateProject = async (projectId, data, userId, guestToken) => {
  await verifyProjectAccess(projectId, userId, guestToken, true)

  const updated = await prisma.project.update({
    where: { id: parseInt(projectId) },
    data
  })

  return updated
}

/**
 * Xóa project
 */
export const deleteProject = async (projectId, userId, guestToken) => {
  await verifyProjectAccess(projectId, userId, guestToken, true)

  await prisma.project.delete({
    where: { id: parseInt(projectId) }
  })

  return true
}

/**
 * Guest claim project (khi tạo tài khoản)
 */
export const claimProject = async (projectId, userId, guestToken) => {
  if (!userId) throw makeError('Yêu cầu đăng nhập để nhận dự án', 401)
  
  const project = await prisma.project.findUnique({
    where: { id: parseInt(projectId) }
  })

  if (!project) throw makeError('Dự án không tồn tại', 404)
  if (project.userId) throw makeError('Dự án này đã thuộc về khóa tài khoản khác', 403)
  if (project.guestToken !== guestToken) throw makeError('Bạn không có quyền nhận dự án này', 403)

  const updated = await prisma.project.update({
    where: { id: parseInt(projectId) },
    data: {
      userId,
      guestToken: null // Xóa guest token để xác nhận đã thuộc về user
    }
  })

  return updated
}
