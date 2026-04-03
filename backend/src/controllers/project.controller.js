import * as projectService from '../services/project.service.js'
import { ok, created } from '../utils/response.js'

// POST /projects
export const createProject = async (req, res, next) => {
  try {
    const userId = req.user?.sub
    const guestToken = req.guestToken
    const project = await projectService.createProject(req.body, userId, guestToken)
    return created(res, project, 'Tạo dự án thành công')
  } catch (err) {
    next(err)
  }
}

// GET /projects
export const listProjects = async (req, res, next) => {
  try {
    const userId = req.user?.sub
    const guestToken = req.guestToken
    const projects = await projectService.listProjects(userId, guestToken)
    return ok(res, projects)
  } catch (err) {
    next(err)
  }
}

// GET /projects/:id
export const getProject = async (req, res, next) => {
  try {
    const userId = req.user?.sub
    const guestToken = req.guestToken
    const project = await projectService.getProject(req.params.id, userId, guestToken)
    return ok(res, project)
  } catch (err) {
    next(err)
  }
}

// PATCH /projects/:id
export const updateProject = async (req, res, next) => {
  try {
    const userId = req.user?.sub
    const guestToken = req.guestToken
    const project = await projectService.updateProject(req.params.id, req.body, userId, guestToken)
    return ok(res, project, 'Cập nhật dự án thành công')
  } catch (err) {
    next(err)
  }
}

// DELETE /projects/:id
export const deleteProject = async (req, res, next) => {
  try {
    const userId = req.user?.sub
    const guestToken = req.guestToken
    await projectService.deleteProject(req.params.id, userId, guestToken)
    return ok(res, null, 'Xóa dự án thành công')
  } catch (err) {
    next(err)
  }
}

// POST /projects/:id/claim
export const claimProject = async (req, res, next) => {
  try {
    const userId = req.user?.sub // required theo middleware
    const guestToken = req.guestToken
    const project = await projectService.claimProject(req.params.id, userId, guestToken)
    return ok(res, project, 'Nhận dự án thành công')
  } catch (err) {
    next(err)
  }
}
