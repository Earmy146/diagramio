import { Router } from 'express'
import { validate } from '../middleware/validate.middleware.js'
import { optionalAuth } from '../middleware/auth.middleware.js'
import { guestSession } from '../middleware/guest.middleware.js'
import * as exportController from '../controllers/export.controller.js'
import { createShareLinkSchema } from '../validators/export.validator.js'

const router = Router()

// Bật guestSession & optionalAuth cho việc tạo share link và lấy dữ liệu
const commonAccess = [optionalAuth, guestSession]

/**
 * @route  POST /api/export/share
 * @desc   Tạo public/shared link cho một project (yêu cầu quyền owner)
 * @body   { projectId: number, permission?: 'VIEW' | 'EDIT', expiresInDays?: number }
 */
router.post(
  '/share',
  commonAccess,
  validate(createShareLinkSchema),
  exportController.createShareLink
)

/**
 * @route  GET /api/export/share/:token
 * @desc   Truy cập dữ liệu shared link dựa trên token
 */
router.get(
  '/share/:token',
  exportController.getSharedData
)

export default router
