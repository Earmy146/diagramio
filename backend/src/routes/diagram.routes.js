import { Router } from 'express'
import { validate } from '../middleware/validate.middleware.js'
import { optionalAuth } from '../middleware/auth.middleware.js'
import { guestSession } from '../middleware/guest.middleware.js'
import * as diagramController from '../controllers/diagram.controller.js'
import { updateDiagramSchema } from '../validators/diagram.validator.js'

const router = Router()
const commonAccess = [optionalAuth, guestSession]

/**
 * @route  GET /api/diagrams/:id
 * @desc   Lấy thông tin chi tiết một diagram 
 */
router.get(
  '/:id',
  commonAccess,
  diagramController.getDiagram
)

/**
 * @route  PUT /api/diagrams/:id
 * @desc   Cập nhật toàn bộ state của diagram (lưu node, edge qua JSON)
 * @body   { name, canvasState, zoomLevel, panX, panY }
 */
router.put(
  '/:id',
  commonAccess,
  validate(updateDiagramSchema),
  diagramController.updateDiagram
)

/**
 * @route  DELETE /api/diagrams/:id
 * @desc   Xóa diagram
 */
router.delete(
  '/:id',
  commonAccess,
  diagramController.deleteDiagram
)

export default router
