import { Router } from 'express'
import { validate } from '../middleware/validate.middleware.js'
import { optionalAuth, requireAuth } from '../middleware/auth.middleware.js'
import { guestSession } from '../middleware/guest.middleware.js'
import * as projectController from '../controllers/project.controller.js'
import * as diagramController from '../controllers/diagram.controller.js'
import { createProjectSchema, updateProjectSchema } from '../validators/project.validator.js'
import { createDiagramSchema } from '../validators/diagram.validator.js'

const router = Router()

// Middleware chung cho hầu hết route:
// Có thể là user hoặc là guest, tự động gán session/user info
const commonAccess = [optionalAuth, guestSession]

/**
 * @route  POST /api/projects
 * @desc   Tạo dự án mới (cho cả user đăng nhập và guest)
 * @body   { name, description, defaultDialect }
 */
router.post(
  '/',
  commonAccess,
  validate(createProjectSchema),
  projectController.createProject
)

/**
 * @route  GET /api/projects
 * @desc   Lấy danh sách các dự án (của user hoặc guest)
 */
router.get(
  '/',
  commonAccess,
  projectController.listProjects
)

/**
 * @route  GET /api/projects/:id
 * @desc   Lấy chi tiết một dự án cùng với tất cả diagrams
 */
router.get(
  '/:id',
  commonAccess,
  projectController.getProject
)

/**
 * @route  PATCH /api/projects/:id
 * @desc   Cập nhật thông tin dự án
 * @body   { name, description, isPublic, defaultDialect }
 */
router.patch(
  '/:id',
  commonAccess,
  validate(updateProjectSchema),
  projectController.updateProject
)

/**
 * @route  DELETE /api/projects/:id
 * @desc   Xóa dự án
 */
router.delete(
  '/:id',
  commonAccess,
  projectController.deleteProject
)

/**
 * @route  POST /api/projects/:id/claim
 * @desc   Nhận dự án đang ở trạng thái guest (yêu cầu người dùng hiện tại phải đăng nhập)
 */
router.post(
  '/:id/claim',
  requireAuth,
  guestSession, // để lấy token nhận diện dự án của phiên này
  projectController.claimProject
)

/**
 * @route  POST /api/projects/:projectId/diagrams
 * @desc   Tạo diagram mới cho dự án
 * @body   { name, canvasState }
 */
router.post(
  '/:projectId/diagrams',
  commonAccess,
  validate(createDiagramSchema),
  diagramController.createDiagram
)

export default router
