import { Router } from 'express'
import { validate } from '../middleware/validate.middleware.js'
import { optionalAuth } from '../middleware/auth.middleware.js'
import { guestSession } from '../middleware/guest.middleware.js'
import * as versionController from '../controllers/version.controller.js'
import { createVersionSchema } from '../validators/version.validator.js'

const router = Router()
const commonAccess = [optionalAuth, guestSession]

/**
 * @route  GET /api/versions/templates
 * @desc   Lấy danh sách các templates hệ thống dựng sẵn
 * @access Public
 */
router.get('/templates', versionController.getTemplates)

/**
 * @route  GET /api/versions/project/:projectId
 * @desc   Lấy danh sách các versions (lịch sử) của một dự án
 * @access Owner (User or Guest)
 */
router.get(
  '/project/:projectId',
  commonAccess,
  versionController.listVersions
)

/**
 * @route  POST /api/versions/project/:projectId
 * @desc   Lưu snapshot version hiện tại của dự án
 * @body   { snapshot: json, message: string }
 */
router.post(
  '/project/:projectId',
  commonAccess,
  validate(createVersionSchema),
  versionController.createVersion
)

/**
 * @route  GET /api/versions/detail/:versionId
 * @desc   Lấy một bản snapshot cụ thể bằng version ID
 */
router.get(
  '/detail/:versionId',
  commonAccess,
  versionController.getVersion
)

export default router
