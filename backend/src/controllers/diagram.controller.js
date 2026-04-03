import * as diagramService from '../services/diagram.service.js'
import { ok, created } from '../utils/response.js'

// POST /projects/:projectId/diagrams
export const createDiagram = async (req, res, next) => {
  try {
    const userId = req.user?.sub
    const guestToken = req.guestToken
    const diagram = await diagramService.createDiagram(req.params.projectId, req.body, userId, guestToken)
    return created(res, diagram, 'Tạo diagram thành công')
  } catch (err) {
    next(err)
  }
}

// GET /diagrams/:id
export const getDiagram = async (req, res, next) => {
  try {
    const userId = req.user?.sub
    const guestToken = req.guestToken
    const diagram = await diagramService.getDiagram(req.params.id, userId, guestToken)
    return ok(res, diagram)
  } catch (err) {
    next(err)
  }
}

// PUT /diagrams/:id
export const updateDiagram = async (req, res, next) => {
  try {
    const userId = req.user?.sub
    const guestToken = req.guestToken
    const diagram = await diagramService.updateDiagram(req.params.id, req.body, userId, guestToken)
    return ok(res, diagram, 'Lưu diagram thành công')
  } catch (err) {
    next(err)
  }
}

// DELETE /diagrams/:id
export const deleteDiagram = async (req, res, next) => {
  try {
    const userId = req.user?.sub
    const guestToken = req.guestToken
    await diagramService.deleteDiagram(req.params.id, userId, guestToken)
    return ok(res, null, 'Xóa diagram thành công')
  } catch (err) {
    next(err)
  }
}
