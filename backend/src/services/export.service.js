import prisma from '../config/prisma.js'
import crypto from 'crypto'

const makeError = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode })

/**
 * Kiểm tra quyền owner để có thể tạo Share Link
 */
const verifyProjectOwner = async (projectId, userId, guestToken) => {
  const p = await prisma.project.findUnique({ where: { id: parseInt(projectId) } })
  if (!p) throw makeError('Dự án không tồn tại', 404)

  const isOwner = (userId && p.userId === userId) || (!p.userId && p.guestToken === guestToken)
  if (!isOwner) throw makeError('Bạn không có quyền chia sẻ dự án này', 403)
  return p
}

export const createShareLink = async (projectId, permission = 'VIEW', expiresInDays, userId, guestToken) => {
  await verifyProjectOwner(projectId, userId, guestToken)

  let expiresAt = null
  if (expiresInDays) {
    expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
  }

  // Generate URL-safe random token
  const token = crypto.randomBytes(24).toString('base64url')

  const sharedLink = await prisma.sharedLink.create({
    data: {
      projectId: parseInt(projectId),
      token,
      permission,
      expiresAt
    }
  })

  return sharedLink
}

export const getSharedData = async (token) => {
  const link = await prisma.sharedLink.findUnique({
    where: { token },
    include: {
      project: {
        include: {
          diagrams: true
        }
      }
    }
  })

  if (!link) {
    throw makeError('Liên kết chia sẻ không tồn tại hoặc đã bị xóa', 404)
  }

  if (link.expiresAt && link.expiresAt < new Date()) {
    throw makeError('Liên kết chia sẻ đã hết hạn', 410)
  }

  // Tăng view count (bất đồng bộ, không cần block response)
  prisma.sharedLink.update({
    where: { id: link.id },
    data: { viewCount: { increment: 1 } }
  }).catch(e => console.warn('[ShareLink] Failed to increment view count:', e.message))

  return {
    linkInfo: {
      permission: link.permission,
      expiresAt: link.expiresAt,
      viewCount: link.viewCount + 1,
      createdAt: link.createdAt
    },
    project: link.project
  }
}
