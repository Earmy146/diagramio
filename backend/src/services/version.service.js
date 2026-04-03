import prisma from '../config/prisma.js'

const makeError = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode })

/**
 * Kiểm tra quyền owner dự án
 */
const verifyProjectOwner = async (projectId, userId, guestToken) => {
  const p = await prisma.project.findUnique({ where: { id: parseInt(projectId) } })
  if (!p) throw makeError('Dự án không tồn tại', 404)

  const isOwner = (userId && p.userId === userId) || (!p.userId && p.guestToken === guestToken)
  if (!isOwner) throw makeError('Bạn không có quyền thực hiện thao tác này', 403)
  return p
}

export const createVersion = async (projectId, snapshot, message, userId, guestToken) => {
  await verifyProjectOwner(projectId, userId, guestToken)

  // Tìm version_number cao nhất hiện tại của project
  const lastVersion = await prisma.projectVersion.findFirst({
    where: { projectId: parseInt(projectId) },
    orderBy: { versionNumber: 'desc' }
  })

  let nextCat = 1
  if (lastVersion) {
    nextCat = lastVersion.versionNumber + 1
  }

  const newVersion = await prisma.projectVersion.create({
    data: {
      projectId: parseInt(projectId),
      userId: userId || null,
      snapshot,
      message: message || `Version ${nextCat}`,
      versionNumber: nextCat
    }
  })

  return newVersion
}

export const listVersions = async (projectId, userId, guestToken) => {
  const p = await verifyProjectOwner(projectId, userId, guestToken)

  const versions = await prisma.projectVersion.findMany({
    where: { projectId: p.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      message: true,
      versionNumber: true,
      createdAt: true
    }
  })

  return versions
}

export const getVersion = async (versionId, userId, guestToken) => {
  const version = await prisma.projectVersion.findUnique({
    where: { id: parseInt(versionId) },
    include: { project: true }
  })

  if (!version) throw makeError('Phiên bản không tồn tại', 404)

  const p = version.project
  const isOwner = (userId && p.userId === userId) || (!p.userId && p.guestToken === guestToken)
  
  if (!isOwner && !p.isPublic) {
    throw makeError('Bạn không có quyền vào dự án này', 403)
  }

  // Loại bỏ object project lớn ra khỏi kết quả
  delete version.project
  return version
}

/**
 * Template tĩnh dựng sẵn để render frontend showcase
 */
export const getTemplates = () => {
  return [
    {
      id: 'template-ecommerce',
      name: 'Hệ thống E-Commerce (Bán hàng)',
      description: 'Lược đồ hoàn chỉnh cho ứng dụng bán hàng cơ bản với Users, Products, Orders và Categories.',
      defaultDialect: 'MYSQL',
      snapshot: {
        tables: [
          {
            id: 'tbl_users',
            name: 'users',
            position: { x: 50, y: 50 },
            columns: [
              { id: 'col_usr_id', name: 'id', dataType: 'INT', isPrimary: true, isAutoIncrement: true },
              { id: 'col_usr_name', name: 'username', dataType: 'VARCHAR(255)' },
              { id: 'col_usr_pwd', name: 'password', dataType: 'VARCHAR(255)' }
            ]
          },
          {
            id: 'tbl_orders',
            name: 'orders',
            position: { x: 450, y: 50 },
            columns: [
              { id: 'col_ord_id', name: 'id', dataType: 'INT', isPrimary: true, isAutoIncrement: true },
              { id: 'col_ord_uid', name: 'user_id', dataType: 'INT', isForeign: true },
              { id: 'col_ord_total', name: 'total_amount', dataType: 'DECIMAL(10,2)' }
            ]
          }
        ],
        relationships: [
          {
            id: 'rel_1',
            fromTableId: 'tbl_orders',
            fromColumnId: 'col_ord_uid',
            toTableId: 'tbl_users',
            toColumnId: 'col_usr_id',
            type: 'ONE_TO_MANY'
          }
        ]
      }
    },
    {
      id: 'template-blog',
      name: 'Hệ thống Blog (Tin tức)',
      description: 'Thiết kế cơ sở dữ liệu cho blog đa tác giả gồm Posts, Comments, Tags.',
      defaultDialect: 'POSTGRESQL',
      snapshot: { tables: [], relationships: [] } // Có thể thêm schema tĩnh đầy đủ
    }
  ]
}
